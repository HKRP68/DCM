const gameConstants = require('../constants/game');

/**
 * Auto-selects a valid Playing XI (11 players) from a squad list
 * satisfying roles constraints: 1 Wicket Keeper, 3 Batsmen, 3 Bowlers, 1 All Rounder, and 3 Wildcards
 */
function autoSelectXI(squad) {
  if (!squad || squad.length < 11) {
    return squad; // Not enough players to filter, return all
  }

  // Extract raw players from database structure (unwrapping if nested in { player: ... })
  const players = squad.map(item => item.player ? item.player : item);

  // Group by role
  const keepers = players.filter(p => p.role === 'wicket_keeper').sort((a, b) => b.ovr - a.ovr);
  const batsmen = players.filter(p => p.role === 'batsman').sort((a, b) => b.ovr - a.ovr);
  const bowlers = players.filter(p => p.role === 'bowler').sort((a, b) => b.ovr - a.ovr);
  const allRounders = players.filter(p => p.role === 'all_rounder').sort((a, b) => b.ovr - a.ovr);

  const selected = [];
  const usedIds = new Set();

  const addPlayer = (p) => {
    if (p && !usedIds.has(p.id)) {
      selected.push(p);
      usedIds.add(p.id);
      return true;
    }
    return false;
  };

  // 1. Mandatory 1 Keeper
  if (keepers.length > 0) addPlayer(keepers[0]);

  // 2. Mandatory 3 Batsmen
  let batCount = 0;
  for (const b of batsmen) {
    if (batCount >= 3) break;
    if (addPlayer(b)) batCount++;
  }

  // 3. Mandatory 3 Bowlers
  let bowlCount = 0;
  for (const b of bowlers) {
    if (bowlCount >= 3) break;
    if (addPlayer(b)) bowlCount++;
  }

  // 4. Mandatory 1 All Rounder
  if (allRounders.length > 0) addPlayer(allRounders[0]);

  // 5. Fill remaining slots with highest OVR players left in the pool
  const remainingPool = players
    .filter(p => !usedIds.has(p.id))
    .sort((a, b) => b.ovr - a.ovr);

  for (const p of remainingPool) {
    if (selected.length >= 11) break;
    addPlayer(p);
  }

  // Absolute fallback: if we still don't have 11 (due to weird role balance), just add any players
  if (selected.length < 11) {
    for (const p of players) {
      if (selected.length >= 11) break;
      addPlayer(p);
    }
  }

  return selected;
}

/**
 * Generate a smart bowling delivery and speed for the AI bowler
 */
function getAIDelivery(bowler) {
  const bowlerType = bowler.bowler_type || 'fast';
  let delivery = 'good_length';
  let speed = 'normal';

  if (bowlerType === 'fast') {
    const list = gameConstants.FAST_DELIVERIES;
    // Weighted choice: good_length (30%), yorker (20%), full_length (20%), short (15%), bouncer (15%)
    const rand = Math.random();
    if (rand < 0.3) delivery = 'good_length';
    else if (rand < 0.5) delivery = 'yorker';
    else if (rand < 0.7) delivery = 'full_length';
    else if (rand < 0.85) delivery = 'short';
    else delivery = 'bouncer';

    // Variation: inswinger (25%), outswinger (25%), fast (20%), normal (20%), slow (10%)
    const vRand = Math.random();
    if (vRand < 0.25) speed = 'inswinger';
    else if (vRand < 0.5) speed = 'outswinger';
    else if (vRand < 0.7) speed = 'fast';
    else if (vRand < 0.9) speed = 'normal';
    else speed = 'slow';
  } else if (bowlerType === 'off_spin') {
    const list = gameConstants.OFF_SPIN_DELIVERIES;
    // Random from off-spin list
    const d = list[Math.floor(Math.random() * list.length)];
    delivery = d.id;
    speed = 'normal'; // Spinners always use normal speed
  } else {
    // leg_spin
    const list = gameConstants.LEG_SPIN_DELIVERIES;
    // Random from leg-spin list
    const d = list[Math.floor(Math.random() * list.length)];
    delivery = d.id;
    speed = 'normal';
  }

  return { delivery, speed };
}

/**
 * Generate a smart batting shot for the AI batsman based on incoming delivery and speed
 */
function getAIShot(batsman, delivery, speed) {
  // Get compatibility mapping for this delivery
  const deliveryCompat = gameConstants.SHOT_BALL_COMPATIBILITY[delivery] || {};

  // Let's find shots from CORE_SHOTS that are highly compatible (>= 0.5)
  const choices = gameConstants.CORE_SHOTS.filter(s => {
    const compat = deliveryCompat[s.id] ?? gameConstants.DEFAULT_COMPATIBILITY;
    return compat >= 0.5;
  });

  let shotObj;

  // 80% chance to play a smart compatible shot, 20% to play any shot (or if no smart shot exists)
  if (choices.length > 0 && Math.random() < 0.8) {
    // We can weight it further by selecting the one with the highest compatibility
    choices.sort((a, b) => {
      const compatA = deliveryCompat[a.id] ?? gameConstants.DEFAULT_COMPATIBILITY;
      const compatB = deliveryCompat[b.id] ?? gameConstants.DEFAULT_COMPATIBILITY;
      return compatB - compatA;
    });
    // Pick from the top 3 smart choices
    const topChoices = choices.slice(0, Math.min(3, choices.length));
    shotObj = topChoices[Math.floor(Math.random() * topChoices.length)];
  } else {
    // Random shot from CORE_SHOTS
    shotObj = gameConstants.CORE_SHOTS[Math.floor(Math.random() * gameConstants.CORE_SHOTS.length)];
  }

  return shotObj.id;
}

function selectValidPlayingXI(squad) {
  if (!squad || squad.length < 11) {
    return {
      success: false,
      error: `You do not have enough players in your squad to play. You own ${squad ? squad.length : 0} player(s), but you need at least 11.\n\nUse /claim to get your starter pack or buy players from the /shop.`
    };
  }

  // 1. Validate if the ENTIRE squad even has enough players of each required role
  const totalBatsmen = squad.filter(p => p.role === 'batsman').length;
  const totalKeepers = squad.filter(p => p.role === 'wicket_keeper').length;
  const totalAllRounders = squad.filter(p => p.role === 'all_rounder').length;
  const totalBowlers = squad.filter(p => p.role === 'bowler').length;

  const missingRoles = [];
  if (totalBatsmen < 3) missingRoles.push(`Batsmen (have ${totalBatsmen}, need at least 3)`);
  if (totalKeepers < 1) missingRoles.push(`Wicket Keepers (have ${totalKeepers}, need at least 1)`);
  if (totalAllRounders < 1) missingRoles.push(`All-Rounders (have ${totalAllRounders}, need at least 1)`);
  if (totalBowlers < 3) missingRoles.push(`Bowlers (have ${totalBowlers}, need at least 3)`);

  if (missingRoles.length > 0) {
    return {
      success: false,
      error: `❌ <b>Insufficient Players in Entire Squad!</b>\n\n` +
             `Your squad does not have enough players of specific roles to satisfy the match requirements.\n\n` +
             `<b>Missing Roles:</b>\n` +
             missingRoles.map(r => `• ${r}`).join('\n') + `\n\n` +
             `🛒 Please visit the <b>/shop</b> to buy additional players with the missing roles so you can play!`
    };
  }

  // The squad is already sorted by squad_order from the DB.
  // The first 11 players are the Playing XI.
  const xi = squad.slice(0, 11).map(item => item.player ? item.player : item);

  // Validate role constraints on the Playing XI
  const batsmen = xi.filter(p => p.role === 'batsman');
  const keepers = xi.filter(p => p.role === 'wicket_keeper');
  const allRounders = xi.filter(p => p.role === 'all_rounder');
  const bowlers = xi.filter(p => p.role === 'bowler');

  const errors = [];
  if (batsmen.length < 3 || batsmen.length > 5) errors.push(`Batsmen: ${batsmen.length} (need 3-5)`);
  if (keepers.length < 1 || keepers.length > 2) errors.push(`Wicket Keepers: ${keepers.length} (need 1-2)`);
  if (allRounders.length < 1 || allRounders.length > 3) errors.push(`All-Rounders: ${allRounders.length} (need 1-3)`);
  if (bowlers.length < 3 || bowlers.length > 5) errors.push(`Bowlers: ${bowlers.length} (need 3-5)`);

  if (errors.length > 0) {
    return {
      success: false,
      error: `Your Playing XI (first 11 players) does not satisfy the role constraints.\n\n` +
             `Current XI roles:\n` +
             `🏏 ${batsmen.length} Batsmen • 🧤 ${keepers.length} WK • ⚡ ${allRounders.length} ALR • 🥎 ${bowlers.length} Bowlers\n\n` +
             `Requirements:\n` +
             `• 3 to 5 Batsmen\n` +
             `• 1 to 2 Wicket Keepers\n` +
             `• 1 to 3 All-Rounders\n` +
             `• 3 to 5 Bowlers\n\n` +
             `Use /swap <pos1> <pos2> to rearrange your squad.`
    };
  }

  return {
    success: true,
    xi
  };
}

module.exports = {
  autoSelectXI,
  getAIDelivery,
  getAIShot,
  selectValidPlayingXI
};
