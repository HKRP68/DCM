const {
  SHOT_BALL_COMPATIBILITY,
  PITCH_FACTORS,
  SPEED_FACTORS
} = require('../constants/game');

/**
 * Core Cricket Engine: Calculates the outcome of a single ball.
 * 
 * @param {Object} batsman - Batsman object (needs name, batting_rating, batting_archetype, tier)
 * @param {Object} bowler - Bowler object (needs name, bowling_rating, bowling_archetype, tier, bowler_type)
 * @param {string} delivery - Delivery type (e.g. bouncer, yorker, etc)
 * @param {string} shot - Batting shot type (e.g. defend, cover_drive, loft, sweep, pull)
 * @param {string} pitch - Pitch type (e.g. balanced, batting, bowling, spin, pace)
 * @param {string} speed - Delivery speed (fast, normal, slow)
 * @param {Array} fieldingXI - Array of player objects representing fielders
 * @param {Object} context - Optional context details (overNumber, totalOvers, isSuperOver, batsmanStats, bowlerStats, movement)
 * @returns {Object} BallOutcome
 */
function calculateBallOutcome(
  batsman,
  bowler,
  delivery,
  shot,
  pitch,
  speed = 'normal',
  fieldingXI = [],
  context = {}
) {
  const rand = Math.random();

  const outcome = {
    runs: 0,
    isWicket: false,
    isExtra: false,
    extraRuns: 0,
    isBoundary: false,
    isSix: false,
    commentary: '',
  };

  // 1. Get Base Compatibility (0.0 to 1.0)
  const baseCompatibility = SHOT_BALL_COMPATIBILITY[delivery]?.[shot] ?? 0.5;

  // 2. Rating Factor
  const ratingDiff = (batsman.batting_rating || 50) - (bowler.bowling_rating || 50);
  const ratingMultiplier = 1 + (ratingDiff / 300); 

  // 3. Pitch Factor
  const pitchEffect = PITCH_FACTORS[pitch] || PITCH_FACTORS.balanced;
  let pitchMultiplier = 1;
  
  if (delivery && delivery.includes('spin')) {
    pitchMultiplier = pitchEffect.spin;
  } else {
    pitchMultiplier = pitchEffect.pace;
  }
  
  const battingPitchMultiplier = pitchEffect.batting;

  // 4. Combined Success Probability
  let successValue = baseCompatibility * ratingMultiplier * battingPitchMultiplier / pitchMultiplier;
  if (delivery === 'mystery_ball') successValue *= 0.85;
  if (context?.movement) successValue *= 0.95;

  // Archetypes & Tiers
  const batArch = batsman.batting_archetype;
  const bowlArch = bowler.bowling_archetype;
  const batTier = batsman.tier;
  const bowlTier = bowler.tier;

  if (batTier === 'Legendary') successValue *= 1.05;
  if (batTier === 'Gold') successValue *= 1.02;
  if (bowlTier === 'Legendary') successValue *= 0.95;
  if (bowlTier === 'Gold') successValue *= 0.98;

  if (batArch === 'Brute') successValue *= 1.1;
  if (batArch === 'Tailender') successValue *= 0.7;
  if (bowlArch === 'Economy') successValue *= 0.88; 
  
  const speedFactors = SPEED_FACTORS[speed] || SPEED_FACTORS.normal;
  const speedWicketMult = speedFactors.wicket_mult || 1;
  const speedRunMult = speedFactors.run_mult || 1;
  
  // 5. Scoring Logic (T20-friendly)
  const totalOvers = Math.max(1, context?.totalOvers || 20);
  const overNumber = Math.max(0, context?.overNumber || 0);
  const isPowerplay = overNumber < Math.min(6, totalOvers);
  const isDeath = overNumber >= Math.max(0, totalOvers - 5);
  
  const powerShots = new Set(['loft', 'slog', 'upper_cut', 'hook', 'pull', 'slog_sweep', 'reverse_sweep', 'drive_on_the_up']);
  const defensiveShots = new Set(['defend', 'leave']);
  
  let boundaryBias = 1;
  if (totalOvers <= 5) boundaryBias *= 1.25;
  else if (totalOvers <= 10) boundaryBias *= 1.15;
  else if (totalOvers <= 15) boundaryBias *= 1.08;
  
  if (isPowerplay) {
    boundaryBias *= 1.2;
    if (batArch === 'Opener') boundaryBias *= 1.15;
  }
  if (isDeath) {
    boundaryBias *= 1.3;
    if (batArch === 'Finisher') boundaryBias *= 1.25;
  }
  if (powerShots.has(shot)) boundaryBias *= 1.2;
  if (batArch === 'Brute') boundaryBias *= 1.15;

  const baseWicketProb = 0.035; 
  let wicketChance = baseWicketProb * (1 + (0.6 - successValue)) * speedWicketMult;
  
  if (batArch === 'Anchor') wicketChance *= 0.75;
  if (batArch === 'Brute') wicketChance *= 1.25;
  if (batArch === 'Tailender') wicketChance *= 2.0;
  if (bowlArch === 'Strike') wicketChance *= 1.2;
  if (bowlArch === 'Wicket-taker') wicketChance *= 1.15;

  if (delivery === 'mystery_ball') wicketChance *= 1.35;
  if (context?.movement) wicketChance *= 1.15;
  if (isDeath) wicketChance *= 1.4; 
  if (isPowerplay && powerShots.has(shot)) wicketChance *= 1.2;

  if (powerShots.has(shot)) wicketChance *= 1.25;
  if (shot === 'defend') wicketChance *= 0.15;
  if (shot === 'leave') wicketChance *= 0.05;

  wicketChance = Math.max(0.005, Math.min(wicketChance, 0.4));

  if (rand < wicketChance) {
    outcome.isWicket = true;
    const wicketRand = Math.random();
    
    if (wicketRand < 0.15) {
      outcome.wicketType = 'bowled';
      outcome.wicketDetail = `b ${bowler.name}`;
    } else if (wicketRand < 0.3) {
      outcome.wicketType = 'lbw';
      outcome.wicketDetail = `lbw b ${bowler.name}`;
    } else if (wicketRand < 0.45) {
      outcome.wicketType = 'caught';
      const wk = fieldingXI.find(p => p.role === 'wicket_keeper') || fieldingXI[0];
      outcome.wicketDetail = `c ${wk?.name || 'Keeper'} b ${bowler.name}`;
    } else if (wicketRand < 0.55) {
      outcome.wicketType = 'caught';
      outcome.wicketDetail = `c & b ${bowler.name}`;
    } else {
      outcome.wicketType = 'caught';
      const fielders = fieldingXI.filter(p => p.id !== bowler.id && p.role !== 'wicket_keeper');
      const fielder = fielders.length > 0 ? fielders[Math.floor(Math.random() * fielders.length)] : null;
      outcome.wicketDetail = `c ${fielder?.name || 'Fielder'} b ${bowler.name}`;
    }
    
    outcome.commentary = generateCommentary(
      'wicket', 
      outcome.wicketType, 
      batsman, 
      bowler, 
      { ...context, detail: outcome.wicketDetail, shot, speed, delivery, isPowerplay, isDeath }
    );
    return outcome;
  }

  const scoringRand = Math.random() * successValue * speedRunMult * boundaryBias;

  if (defensiveShots.has(shot)) {
    if (shot === 'leave') {
       outcome.runs = Math.random() < 0.1 ? 1 : 0;
    } else { 
       const r = Math.random();
       if (r < 0.15) outcome.runs = 2;
       else if (r < 0.45) outcome.runs = 1;
       else outcome.runs = 0;
    }
  } else {
    if (scoringRand > 0.85) {
      outcome.runs = 6;
      outcome.isSix = true;
      outcome.isBoundary = true;
    } else if (scoringRand > 0.65) {
      outcome.runs = 4;
      outcome.isBoundary = true;
    } else if (scoringRand > 0.5) {
      outcome.runs = Math.random() < 0.2 ? 3 : 2;
    } else if (scoringRand > 0.25) {
      outcome.runs = 1;
    } else {
      outcome.runs = 0;
    }
  }

  outcome.commentary = generateCommentary('runs', outcome.runs, batsman, bowler, {
    ...context, shot, speed, delivery, isPowerplay, isDeath
  });
  
  return outcome;
}

function generateCommentary(type, value, batsman, bowler, context) {
  const batName = batsman.name || 'Batsman';
  const bowlName = bowler.name || 'Bowler';
  const { shot, speed, delivery, wicketType, detail } = context;

  // Format terms for clean display
  let shotFormatted = shot ? shot.toLowerCase().replace(/_/g, ' ') : 'shot';
  if (shotFormatted === 'straight drive') {
    shotFormatted = 'drive';
  }
  if (shotFormatted === 'cover drive') {
    shotFormatted = 'cut';
  }
  const deliveryFormatted = delivery ? delivery.toLowerCase().replace(/_/g, ' ') : 'delivery';
  
  // Speed values mapping
  const speedStr = speed === 'fast' ? 'searing fast' : 
                   speed === 'slow' ? 'slower' : 
                   speed === 'inswinger' ? 'swinging in' : 
                   speed === 'outswinger' ? 'swinging out' : 
                   'normal';

  // Random picker helper
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (type === 'wicket') {
    const cleanDetail = detail || `out b ${bowlName}`;
    const bowledTemplates = [
      `🎯 Clean bowled! ${bowlName} delivers an absolute peach of a ${deliveryFormatted}. It pitches perfectly, beats the defensive bat of ${batName} and sends the middle stump flying!`,
      `Timber! ${bowlName} bowls a beautiful ${deliveryFormatted}. ${batName} tries to play a ${shotFormatted} but leaves a massive gap. The woodwork is disturbed!`,
      `Through the gate! ${batName} completely misjudges the flight of a ${deliveryFormatted} from ${bowlName} and gets cleaned up!`
    ];
    const lbwTemplates = [
      `☝️ Huge appeal for LBW! ${bowlName} fires in a quick ${deliveryFormatted} that strikes the pad of ${batName} on the crease. The umpire's finger goes up!`,
      `Dead in front! ${batName} is trapped in front of the stumps by a sharp ${deliveryFormatted} from ${bowlName}. Clean LBW!`
    ];
    const caughtTemplates = [
      `🧤 Edged and caught! ${bowlName} coaxes an edge with a superb ${deliveryFormatted}. ${batName} tried a ${shotFormatted} but nicked it straight to the keeper!`,
      `Out! ${batName} goes for a big shot against ${bowlName}'s ${deliveryFormatted}, but gets a leading edge. The fielder under it runs in and takes a clean catch!`,
      `💥 Taken! ${batName} plays a powerful ${shotFormatted} off a ${deliveryFormatted} by ${bowlName}, but doesn't get enough distance. Easy catch in the deep!`,
      `What a spectacular catch! ${batName} hits a hard ${shotFormatted}, but it flies straight to a diving fielder off the bowling of ${bowlName}!`
    ];

    if (wicketType === 'bowled') return pick(bowledTemplates);
    if (wicketType === 'lbw') return pick(lbwTemplates);
    return pick(caughtTemplates);
  }

  if (value === 6) {
    const sixTemplates = [
      `🚀 That is massive! ${batName} stands tall and lofts the ${deliveryFormatted} from ${bowlName} straight over the bowler's head for a monstrous SIX!`,
      `💥 CRACK! A beautiful ${shotFormatted} by ${batName} sends the ball sailing deep into the stands off ${bowlName}! High, handsome, and maximum!`,
      `Smacked! ${batName} picks up the ${speedStr} ${deliveryFormatted} early, plays a clean ${shotFormatted}, and clears the boundary rope with ease! Six runs!`
    ];
    return pick(sixTemplates);
  }

  if (value === 4) {
    const fourTemplates = [
      `⚡ Shot! ${batName} transfers weight quickly, plays a textbook ${shotFormatted} off ${bowlName}'s ${deliveryFormatted}, and it races away to the boundary for FOUR!`,
      `Beautiful timing! ${batName} pierces the gap between cover and point off ${bowlName}'s ${deliveryFormatted} for a boundary!`,
      `Flicked away! ${batName} plays a crisp ${shotFormatted} off the pads, sending the ${deliveryFormatted} away to the fence for four runs.`
    ];
    return pick(fourTemplates);
  }

  if (value === 0) {
    if (shot === 'leave') {
      return pick([
        `${batName} leaves the ${deliveryFormatted} alone as it sails through to the wicketkeeper.`,
        `No shot offered. ${batName} lets the ${deliveryFormatted} from ${bowlName} go through cleanly.`
      ]);
    }
    if (shot === 'defend') {
      return pick([
        `Solid defensive block from ${batName} to a ${deliveryFormatted} bowled by ${bowlName}.`,
        `${batName} defends the ${deliveryFormatted} carefully back to the bowler.`,
        `No run. ${batName} plays a defensive shot but can't find the gap.`
      ]);
    }
    // They played an active/aggressive shot but got a dot ball
    return pick([
      `No run. ${batName} attempts a ${shotFormatted} off the ${deliveryFormatted} but hits it straight to a fielder.`,
      `Beaten! ${batName} tries to play a ${shotFormatted} off ${bowlName}'s ${deliveryFormatted} but misses completely.`,
      `A swing and a miss! ${batName} goes for a big ${shotFormatted} against the ${deliveryFormatted} from ${bowlName} but fails to connect.`,
      `${batName} connects with a ${shotFormatted} but cannot pierce the infield. Dot ball.`
    ]);
  }

  const runsText = value === 1 ? '1 run' : `${value} runs`;
  const runTemplates = [
    `${batName} plays a nice ${shotFormatted} off ${bowlName}'s ${deliveryFormatted} to collect ${runsText}.`,
    `Tucked away! ${batName} uses the ${shotFormatted} to work the ${deliveryFormatted} into the gap for ${runsText}.`,
    `Good running! ${batName} pushes this ${deliveryFormatted} into the gap with a ${shotFormatted} and picks up ${runsText}.`,
    `${batName} taps the ${deliveryFormatted} from ${bowlName} to the off-side with a ${shotFormatted} and rotates the strike.`
  ];
  return pick(runTemplates);
}

module.exports = {
  calculateBallOutcome,
  generateCommentary
};
