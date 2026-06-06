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

  // --- 1. Extras & Bowler Spam Detection ---
  const deliveryHistory = context.deliveryHistory || [];
  const speedHistory = context.speedHistory || [];
  let extraChance = 0.015; // 1.5% base chance of an extra

  // If bowler bowls same delivery 3+ times in a row
  if (deliveryHistory.length >= 2) {
    const lastDel = deliveryHistory[deliveryHistory.length - 1];
    const secondLastDel = deliveryHistory[deliveryHistory.length - 2];
    if (delivery === lastDel && delivery === secondLastDel) {
      extraChance += 0.22; // 22% additional chance
    }
  }
  if (deliveryHistory.length >= 3) {
    const countIdentical = deliveryHistory.filter(d => d === delivery).length;
    if (countIdentical >= 3) {
      extraChance += 0.15;
    }
  }
  // Speed spamming
  if (speedHistory.length >= 2) {
    const lastSpeed = speedHistory[speedHistory.length - 1];
    const secondLastSpeed = speedHistory[speedHistory.length - 2];
    if (speed === lastSpeed && speed === secondLastSpeed) {
      extraChance += 0.10;
    }
  }

  // Trigger Extra (Wide / No-ball)
  if (rand < extraChance) {
    outcome.isExtra = true;
    const isNoBall = Math.random() < 0.3; // 30% no-ball, 70% wide
    outcome.runs = 1;
    outcome.extraType = isNoBall ? 'no-ball' : 'wide';
    
    const extraTemplates = isNoBall ? [
      `🚫 No-ball! ${bowler.name} oversteps the crease! That's a penalty run and the bowler must rebowl.`,
      `🚨 Oh no! ${bowler.name} has bowled a front-foot no-ball. The batting team is awarded 1 extra run!`,
    ] : [
      `↔️ Wide ball! ${bowler.name} strays too far down the leg side. The umpire signals a wide.`,
      `↔️ Wide called! ${bowler.name} bowls one way outside off stump, out of reach for ${batsman.name}.`,
    ];
    outcome.commentary = extraTemplates[Math.floor(Math.random() * extraTemplates.length)];
    return outcome;
  }

  // --- 2. Match Phases (Realistic definition) ---
  const totalOvers = Math.max(1, context?.totalOvers || 20);
  const overNumber = Math.max(0, context?.overNumber || 0);

  let isPowerplay = false;
  let isDeath = false;
  let isMiddle = false;

  if (totalOvers <= 5) {
    isPowerplay = (overNumber < 1);
    isDeath = (overNumber >= totalOvers - 1);
  } else if (totalOvers <= 10) {
    isPowerplay = (overNumber < 2);
    isDeath = (overNumber >= totalOvers - 2);
  } else if (totalOvers <= 15) {
    isPowerplay = (overNumber < 3);
    isDeath = (overNumber >= totalOvers - 3);
  } else {
    isPowerplay = (overNumber < 6);
    isDeath = (overNumber >= totalOvers - 4);
  }
  isMiddle = !isPowerplay && !isDeath;

  // --- 3. Get Base Compatibility (0.0 to 1.0) ---
  const compoundKey = `${speed}_${delivery}`;
  let baseCompatibility = 0.5;
  if (SHOT_BALL_COMPATIBILITY[compoundKey]) {
    baseCompatibility = SHOT_BALL_COMPATIBILITY[compoundKey][shot] ?? 0.5;
  } else {
    baseCompatibility = SHOT_BALL_COMPATIBILITY[delivery]?.[shot] ?? 0.5;
  }

  // --- 4. Rating Factor ---
  const ratingDiff = (batsman.batting_rating || 50) - (bowler.bowling_rating || 50);
  const ratingMultiplier = 1 + (ratingDiff / 120); // More than doubled the weight of rating diff

  // --- Platoon Matchup (Left/Right) ---
  let matchupMultiplier = 1.0;
  const batHand = batsman.batting_hand || 'right';
  const bowlType = bowler.bowler_type || 'fast';

  if (bowlType === 'off_spin') {
    if (batHand === 'left') {
      matchupMultiplier = 0.90; // Off-spin turns away from lefties (bowler advantage)
    } else {
      matchupMultiplier = 1.06; // Turns into righties (easier to hit)
    }
  } else if (bowlType === 'leg_spin' || bowlType === 'left_arm_orthodox') {
    if (batHand === 'right') {
      matchupMultiplier = 0.90; // Leg-spin / Orthodox turns away from righties (bowler advantage)
    } else {
      matchupMultiplier = 1.06; // Turns into lefties (easier to hit)
    }
  }

  // --- Batsman Set-ness (Confidence Boost) ---
  const ballsFaced = context?.batsmanStats?.balls || 0;
  const confidenceMultiplier = 1 + Math.min(0.20, ballsFaced * 0.02); // Up to +20% success rate

  // --- Bowler Fatigue / Match Rhythm (Economy-based) ---
  let bowlerRhythmMultiplier = 1.0;
  const bowlerOvers = context?.bowlerStats?.overs || 0;
  const bowlerRuns = context?.bowlerStats?.runsConceded || 0;
  if (bowlerOvers > 0) {
    const wholeOvers = Math.floor(bowlerOvers);
    const extraBalls = Math.round((bowlerOvers % 1) * 10);
    const totalBowlerBalls = (wholeOvers * 6) + extraBalls;
    if (totalBowlerBalls >= 6) {
      const economy = (bowlerRuns / totalBowlerBalls) * 6;
      if (economy > 12.0) {
        bowlerRhythmMultiplier = 1.08; // Leaking runs, batsman finds it easier
      } else if (economy < 6.0) {
        bowlerRhythmMultiplier = 0.92; // Tight economy, batsman struggles
      }
    }
  }

  // --- Bowler Spam (Batsman getting used to the ball) ---
  let bowlerSpamScoringMultiplier = 1.0;
  let bowlerSpamWicketMultiplier = 1.0;

  if (deliveryHistory.length >= 2) {
    const lastDel = deliveryHistory[deliveryHistory.length - 1];
    const secondLastDel = deliveryHistory[deliveryHistory.length - 2];
    if (delivery === lastDel && delivery === secondLastDel) {
      bowlerSpamScoringMultiplier += 0.20; // +20% scoring boost if bowled 3 times in a row
      bowlerSpamWicketMultiplier -= 0.35;  // -35% wicket chance
    } else if (delivery === lastDel) {
      bowlerSpamScoringMultiplier += 0.08; // +8% scoring boost if bowled 2 times in a row
      bowlerSpamWicketMultiplier -= 0.15;  // -15% wicket chance
    }
  }
  if (speedHistory.length >= 2) {
    const lastSpeed = speedHistory[speedHistory.length - 1];
    const secondLastSpeed = speedHistory[speedHistory.length - 2];
    if (speed === lastSpeed && speed === secondLastSpeed) {
      bowlerSpamScoringMultiplier += 0.12; // +12% scoring boost on speed spam 3 times
    } else if (speed === lastSpeed) {
      bowlerSpamScoringMultiplier += 0.05; // +5% scoring boost on speed spam 2 times
    }
  }

  // --- 5. Pitch & Bowler Realism ---
  const pitchEffect = PITCH_FACTORS[pitch] || PITCH_FACTORS.balanced;
  let pitchMultiplier = 1;
  const isSpinBall = delivery && (delivery.includes('spin') || delivery.includes('break') || delivery.includes('doosra') || delivery.includes('googly') || delivery.includes('flipper') || delivery.includes('slider') || delivery.includes('carrom'));
  
  if (isSpinBall) {
    pitchMultiplier = pitchEffect.spin;
  } else {
    pitchMultiplier = pitchEffect.pace;
  }
  
  const battingPitchMultiplier = pitchEffect.batting;

  // Combine multipliers into successValue
  let successValue = baseCompatibility * ratingMultiplier * matchupMultiplier * confidenceMultiplier * bowlerRhythmMultiplier * bowlerSpamScoringMultiplier * battingPitchMultiplier / pitchMultiplier;

  // Match bowler style with pitch style
  let pitchWicketMult = 1.0;
  if (pitch === 'spin' && isSpinBall) {
    successValue *= 0.90; // Spinners harder to hit on spin pitch
    pitchWicketMult = 1.25; // Spinners take more wickets on spin pitch
  }
  if (pitch === 'pace' && !isSpinBall) {
    successValue *= 0.90; // Pace bowlers harder to hit on green pitch
    pitchWicketMult = 1.25;
  }

  if (delivery === 'mystery_ball' || context?.isMysteryBall) successValue *= 0.85;
  if (context?.movement) successValue *= 0.95;

  // Tiers and Archetypes
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

  // --- 6. Batsman Spam Penalties ---
  const shotHistory = context.shotHistory || [];
  let shotSpamWicketMult = 1.0;
  let shotSpamRunMult = 1.0;

  if (shotHistory.length >= 2) {
    const lastShot = shotHistory[shotHistory.length - 1];
    const secondLastShot = shotHistory[shotHistory.length - 2];
    if (shot === lastShot && shot === secondLastShot) {
      shotSpamWicketMult = 1.7; // Toned down from 2.2
      shotSpamRunMult = 0.7;    // Boosted from 0.5
    } else if (shot === lastShot) {
      shotSpamWicketMult = 1.35; // Toned down from 1.5
      shotSpamRunMult = 0.85;   // Boosted from 0.75
    }
  }

  // --- 7. Momentum System ---
  const recentOutcomes = context.recentOutcomes || [];
  let momentumRunMult = 1.0;
  let momentumWicketMult = 1.0;

  if (recentOutcomes.length > 0) {
    const recentRuns = recentOutcomes.reduce((acc, curr) => acc + (curr.runs || 0), 0);
    const recentWickets = recentOutcomes.filter(curr => curr.isWicket).length;
    const recentDots = recentOutcomes.filter(curr => curr.runs === 0 && !curr.isWicket && !curr.isExtra).length;

    // Batting momentum
    if (recentRuns >= 12) {
      momentumRunMult += 0.15;
      momentumWicketMult += 0.10; // extra aggression carries slight risk
    } else if (recentRuns >= 8) {
      momentumRunMult += 0.08;
    }

    // Bowling momentum
    if (recentWickets > 0) {
      momentumWicketMult += 0.25;
      momentumRunMult -= 0.10;
    }
    if (recentDots >= 3) {
      momentumWicketMult += 0.15;
      momentumRunMult -= 0.08;
    }
  }

  // Apply final multipliers to successValue
  successValue = successValue * shotSpamRunMult * momentumRunMult;
  successValue = Math.max(0.15, Math.min(successValue, 0.95)); // Clip to prevent OP/underpowered cases

  // --- Free Hit Success Boost ---
  if (context?.isFreeHit) {
    successValue *= 1.25;
    successValue = Math.max(0.15, Math.min(successValue, 1.2)); // Allow slightly higher success cap on free hits
  }

  // --- 8. Phase adjustments & Wicket Logic ---
  const powerShots = new Set(['loft', 'slog', 'upper_cut', 'hook', 'pull', 'slog_sweep', 'reverse_sweep', 'drive_on_the_up']);
  const defensiveShots = new Set(['defend', 'leave']);

  let boundaryBias = 1;
  if (totalOvers <= 5) boundaryBias *= 1.25;
  else if (totalOvers <= 10) boundaryBias *= 1.15;
  else if (totalOvers <= 15) boundaryBias *= 1.08;

  // Powerplay details
  if (isPowerplay) {
    boundaryBias *= 1.25; // boost run scoring
    if (batArch === 'Opener') boundaryBias *= 1.15;
  }
  // Middle overs details
  if (isMiddle) {
    boundaryBias *= 0.95; // tighter scoring
    if (isSpinBall) {
      successValue *= 0.92; // spinners control middle overs
    }
  }
  // Death overs details
  if (isDeath) {
    boundaryBias *= 1.35; // extreme runs
    if (batArch === 'Finisher') boundaryBias *= 1.25;
  }

  if (powerShots.has(shot)) boundaryBias *= 1.2;
  if (batArch === 'Brute') boundaryBias *= 1.15;

  // --- Match Pressure (Chasing Context) ---
  let matchPressureWicketMultiplier = 1.0;
  let matchPressureBoundaryMultiplier = 1.0;

  if (context?.isSecondInnings && context?.target) {
    const runsNeeded = context.target - (context.runsScored || 0);
    const ballsRemaining = context.ballsRemaining !== undefined ? context.ballsRemaining : 0;
    if (ballsRemaining > 0) {
      const requiredRunRate = (runsNeeded / ballsRemaining) * 6;
      if (requiredRunRate > 10.0) {
        if (powerShots.has(shot)) {
          matchPressureBoundaryMultiplier = 1.15; // 15% boost to boundaries
          matchPressureWicketMultiplier = 1.25;    // 25% increase in wicket risk
        }
      }
    }
  }

  boundaryBias *= matchPressureBoundaryMultiplier;

  // --- Free Hit Boundary Bias ---
  if (context?.isFreeHit) {
    boundaryBias *= 1.35;
  }

  // --- Wicket Rating Multiplier ---
  const wicketRatingMultiplier = Math.max(0.5, Math.min(1.8, 1 - (ratingDiff / 150)));

  // --- Batsman Set-ness (Confidence Wicket Reduction) ---
  const setnessWicketReduction = Math.max(0.60, 1 - (ballsFaced * 0.04));

  // Wicket Chance
  const baseWicketProb = 0.035;
  let wicketChance = baseWicketProb * (1 + (0.6 - successValue)) * speedWicketMult * pitchWicketMult * shotSpamWicketMult * momentumWicketMult * wicketRatingMultiplier * setnessWicketReduction * (bowlerSpamWicketMultiplier || 1.0) * matchPressureWicketMultiplier;

  if (batArch === 'Anchor') wicketChance *= 0.75;
  if (batArch === 'Brute') wicketChance *= 1.25;
  if (batArch === 'Tailender') wicketChance *= 2.0;
  if (bowlArch === 'Strike') wicketChance *= 1.2;
  if (bowlArch === 'Wicket-taker') wicketChance *= 1.15;

  if (delivery === 'mystery_ball' || context?.isMysteryBall) wicketChance *= 1.35;
  if (context?.movement) wicketChance *= 1.15;
  
  if (isDeath) wicketChance *= 1.35;
  if (isPowerplay && powerShots.has(shot)) wicketChance *= 1.1; // lower risk of getting caught in powerplay
  if (isMiddle && powerShots.has(shot)) wicketChance *= 1.45; // higher risk in middle overs with deep fielders

  if (powerShots.has(shot)) wicketChance *= 1.25;
  if (shot === 'defend') wicketChance *= 0.15;
  if (shot === 'leave') wicketChance *= 0.05;

  if (context?.isFreeHit) {
    wicketChance = 0; // Immune to wickets on Free Hit
  } else {
    wicketChance = Math.max(0.005, Math.min(wicketChance, 0.45));
  }

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

  // --- 9. Runs Scoring ---
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

  let resultCommentary = '';

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

    if (wicketType === 'bowled') resultCommentary = pick(bowledTemplates);
    else if (wicketType === 'lbw') resultCommentary = pick(lbwTemplates);
    else resultCommentary = pick(caughtTemplates);
  } else if (value === 6) {
    const sixTemplates = [
      `🚀 That is massive! ${batName} stands tall and lofts the ${deliveryFormatted} from ${bowlName} straight over the bowler's head for a monstrous SIX!`,
      `💥 CRACK! A beautiful ${shotFormatted} by ${batName} sends the ball sailing deep into the stands off ${bowlName}! High, handsome, and maximum!`,
      `Smacked! ${batName} picks up the ${speedStr} ${deliveryFormatted} early, plays a clean ${shotFormatted}, and clears the boundary rope with ease! Six runs!`
    ];
    resultCommentary = pick(sixTemplates);
  } else if (value === 4) {
    const fourTemplates = [
      `⚡ Shot! ${batName} transfers weight quickly, plays a textbook ${shotFormatted} off ${bowlName}'s ${deliveryFormatted}, and it races away to the boundary for FOUR!`,
      `Beautiful timing! ${batName} pierces the gap between cover and point off ${bowlName}'s ${deliveryFormatted} for a boundary!`,
      `Flicked away! ${batName} plays a crisp ${shotFormatted} off the pads, sending the ${deliveryFormatted} away to the fence for four runs.`
    ];
    resultCommentary = pick(fourTemplates);
  } else if (value === 0) {
    if (shot === 'leave') {
      resultCommentary = pick([
        `${batName} leaves the ${deliveryFormatted} alone as it sails through to the wicketkeeper.`,
        `No shot offered. ${batName} lets the ${deliveryFormatted} from ${bowlName} go through cleanly.`
      ]);
    } else if (shot === 'defend') {
      resultCommentary = pick([
        `Solid defensive block from ${batName} to a ${deliveryFormatted} bowled by ${bowlName}.`,
        `${batName} defends the ${deliveryFormatted} carefully back to the bowler.`,
        `No run. ${batName} plays a defensive shot but can't find the gap.`
      ]);
    } else {
      // They played an active/aggressive shot but got a dot ball
      resultCommentary = pick([
        `No run. ${batName} attempts a ${shotFormatted} off the ${deliveryFormatted} but hits it straight to a fielder.`,
        `Beaten! ${batName} tries to play a ${shotFormatted} off ${bowlName}'s ${deliveryFormatted} but misses completely.`,
        `A swing and a miss! ${batName} goes for a big ${shotFormatted} against the ${deliveryFormatted} from ${bowlName} but fails to connect.`,
        `${batName} connects with a ${shotFormatted} but cannot pierce the infield. Dot ball.`
      ]);
    }
  } else {
    const runsText = value === 1 ? '1 run' : `${value} runs`;
    const runTemplates = [
      `${batName} plays a nice ${shotFormatted} off ${bowlName}'s ${deliveryFormatted} to collect ${runsText}.`,
      `Tucked away! ${batName} uses the ${shotFormatted} to work the ${deliveryFormatted} into the gap for ${runsText}.`,
      `Good running! ${batName} pushes this ${deliveryFormatted} into the gap with a ${shotFormatted} and picks up ${runsText}.`,
      `${batName} taps the ${deliveryFormatted} from ${bowlName} to the off-side with a ${shotFormatted} and rotates the strike.`
    ];
    resultCommentary = pick(runTemplates);
  }

  if (context?.isFreeHit) {
    resultCommentary = `🚀 <b>[FREE HIT]</b> ` + resultCommentary;
  }

  return resultCommentary;
}

module.exports = {
  calculateBallOutcome,
  generateCommentary
};
