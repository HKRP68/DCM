// =============================================
// GAME CONSTANTS (CommonJS adaptation for Bot)
// =============================================

const SQUAD_MAX_SIZE = 25;
const PLAYING_XI_SIZE = 11;
const MIN_BATSMEN = 3;
const MAX_BATSMEN = 5;
const MIN_BOWLERS = 3;
const MAX_BOWLERS = 5;
const MIN_WICKET_KEEPERS = 1;
const MIN_ALL_ROUNDERS = 1;

const STARTING_COINS = 1000;
const DROP_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const DAILY_REWARD_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const SELL_PRICE_RATIO = 0.6; // 60% of buy price

const WINNER_REWARD_PER_OVER = 1000;
const LOSER_REWARD_PER_OVER = 300;

const MIN_OVERS = 1;
const MAX_OVERS = 20;
const BALLS_PER_OVER = 6;

const TOSS_TIMER_S = 15;
const XI_SELECTION_TIMER_S = 60;
const TURN_TIMER_S = 15;
const MAX_TIMEOUTS = 3;

const TOSS_TIMER_MS = TOSS_TIMER_S * 1000;
const XI_SELECTION_TIMER_MS = XI_SELECTION_TIMER_S * 1000;
const BALL_TIMER_MS = TURN_TIMER_S * 1000;

const DROP_COIN_CHANCE = 0.5;
const DROP_CARD_CHANCE = 0.5;
const DROP_MIN_CARD_OVR = 60;
const DROP_MAX_CARD_OVR = 87;
const DROP_COIN_MIN = 100;
const DROP_COIN_MAX = 500;

const DROP_OVR_WEIGHTS = [
  { max: 70, weight: 0.60 },
  { max: 75, weight: 0.25 },
  { max: 80, weight: 0.10 },
  { max: 84, weight: 0.04 },
  { max: 87, weight: 0.01 },
];

const DAILY_COIN_MIN = 200;
const DAILY_COIN_MAX = 800;
const DAILY_CARD_CHANCE = 0.4;
const DAILY_MAX_CARD_OVR = 88;

function getPlayerPrice(ovr) {
  if (ovr >= 99) return 4525000;
  if (ovr >= 98) return 4155500;
  if (ovr >= 97) return 3500000;
  if (ovr >= 95) return 2500000;
  if (ovr >= 90) return 1000000;
  if (ovr >= 85) return 250000;
  if (ovr >= 80) return 80000;
  
  if (ovr >= 75) {
    return 25000 + (ovr - 75) * 7000;
  }
  if (ovr >= 70) {
    return 10000 + (ovr - 70) * 2500;
  }
  if (ovr >= 65) {
    return 4000 + (ovr - 65) * 1000;
  }
  if (ovr >= 60) {
    return 2000 + (ovr - 60) * 400;
  }
  return 800;
}

const PITCH_TYPES = ['batting', 'bowling', 'spin', 'pace', 'balanced'];

const FAST_DELIVERIES = [
  { id: 'yorker', label: 'Yorker', icon: '🎯', sticker: 'yorker' },
  { id: 'full_length', label: 'Full Length', icon: '📏', sticker: 'full_length' },
  { id: 'good_length', label: 'Good Length', icon: '📍', sticker: 'good_length' },
  { id: 'short', label: 'Short', icon: '📐', sticker: 'short' },
  { id: 'bouncer', label: 'Bouncer', icon: '👺', sticker: 'bouncer' },
];

const FAST_VARIATIONS = [
  { id: 'inswinger', label: 'Inswing', icon: '↪️', sticker: 'inswinger' },
  { id: 'outswinger', label: 'Outswing', icon: '↩️', sticker: 'outswinger' },
  { id: 'fast', label: 'Fast', icon: '🔥', sticker: 'fast' },
  { id: 'normal', label: 'Normal', icon: '⚽', sticker: 'normal' },
  { id: 'slow', label: 'Slow', icon: '🐢', sticker: 'slow' },
];

const OFF_SPIN_DELIVERIES = [
  { id: 'off_break', label: 'Off Break', icon: '🔄' },
  { id: 'carrom_ball', label: 'Carrom Ball', icon: '🫰' },
  { id: 'arm_ball', label: 'Arm Ball', icon: '💪' },
  { id: 'doosra', label: 'Doosra', icon: '🔁' },
  { id: 'top_spinner_off', label: 'Top Spinner', icon: '🔝' },
  { id: 'mystery_ball', label: 'Mystery Ball', icon: '🎲' },
];

const LEG_SPIN_DELIVERIES = [
  { id: 'leg_break', label: 'Leg Break', icon: '🦵' },
  { id: 'googly', label: 'Googly', icon: '🌀' },
  { id: 'flipper', label: 'Flipper', icon: '🫱' },
  { id: 'top_spinner_leg', label: 'Top Spinner', icon: '🔝' },
  { id: 'slider', label: 'Slider', icon: '➡️' },
  { id: 'mystery_ball', label: 'Mystery Ball', icon: '🎲' },
];

const DELIVERY_SPEEDS = [
  { id: 'fast', label: 'Fast', minKph: 140, maxKph: 155 },
  { id: 'normal', label: 'Normal', minKph: 130, maxKph: 142 },
  { id: 'slow', label: 'Slow', minKph: 115, maxKph: 132 },
];

const CORE_SHOTS = [
  { id: 'defend', label: 'Defend', icon: '🛡️', category: 'defensive', sticker: 'defend' },
  { id: 'straight_drive', label: 'Drive', icon: '☄️', category: 'drive', sticker: 'straight_drive' },
  { id: 'cut', label: 'Cut', icon: '✂️', category: 'cross_bat', sticker: 'cut' },
  { id: 'pull', label: 'Pull', icon: '🌪️', category: 'cross_bat', sticker: 'pull' },
  { id: 'sweep', label: 'Sweep', icon: '🧹', category: 'sweep', sticker: 'sweep' },
  { id: 'loft', label: 'Loft', icon: '🚀', category: 'power', sticker: 'loft' },
  { id: 'flick', label: 'Flick', icon: '🪄', category: 'touch', sticker: 'flick' },
  { id: 'leave', label: 'Leave', icon: '🚫', category: 'defensive', sticker: 'leave' },
];

const BATTING_SHOTS = [
  ...CORE_SHOTS,
  { id: 'leave', label: 'Leave', icon: '🚫', category: 'defensive' },
  { id: 'on_drive', label: 'On Drive', icon: '↖️', category: 'drive' },
  { id: 'off_drive', label: 'Off Drive', icon: '➡️', category: 'drive' },
  { id: 'hook', label: 'Hook', icon: '🪝', category: 'cross_bat' },
  { id: 'cut', label: 'Cut', icon: '✂️', category: 'cross_bat' },
  { id: 'square_cut', label: 'Square Cut', icon: '📐', category: 'cross_bat' },
  { id: 'late_cut', label: 'Late Cut', icon: '🕐', category: 'cross_bat' },
  { id: 'reverse_sweep', label: 'Reverse Sweep', icon: '🔁', category: 'sweep' },
  { id: 'slog_sweep', label: 'Slog Sweep', icon: '💥', category: 'sweep' },
  { id: 'glance', label: 'Glance', icon: '👀', category: 'touch' },
  { id: 'paddle', label: 'Paddle', icon: '🏓', category: 'touch' },
  { id: 'slog', label: 'Slog', icon: '🔨', category: 'power' },
  { id: 'upper_cut', label: 'Upper Cut', icon: '⬆️', category: 'power' },
  { id: 'drive_on_the_up', label: 'Drive on the Up', icon: '📈', category: 'power' },
];

const SHOTS = BATTING_SHOTS.map(s => s.id);

const SHOT_CATEGORIES = {
  defensive: ['defend', 'leave'],
  drive: ['straight_drive', 'cover_drive', 'on_drive', 'off_drive'],
  cross_bat: ['pull', 'hook', 'cut', 'square_cut', 'late_cut'],
  sweep: ['sweep', 'reverse_sweep', 'slog_sweep'],
  touch: ['flick', 'glance', 'paddle'],
  power: ['loft', 'slog', 'upper_cut', 'drive_on_the_up'],
};

const DELIVERIES = {
  fast: FAST_DELIVERIES.map(d => d.id),
  off_spin: OFF_SPIN_DELIVERIES.map(d => d.id),
  leg_spin: LEG_SPIN_DELIVERIES.map(d => d.id),
};

const SPEED_OPTIONS = DELIVERY_SPEEDS.map(s => s.id);

const PITCH_FACTORS = {
  batting: { batting: 1.2, pace: 0.9, spin: 0.9 },
  bowling: { batting: 0.9, pace: 1.1, spin: 1.1 },
  spin: { batting: 1.0, pace: 0.9, spin: 1.25 },
  pace: { batting: 1.0, pace: 1.2, spin: 0.9 },
  balanced: { batting: 1.0, pace: 1.0, spin: 1.0 },
};

const SPEED_FACTORS = {
  fast: { wicket_mult: 1.2, run_mult: 1.1 },
  normal: { wicket_mult: 1.0, run_mult: 1.0 },
  slow: { wicket_mult: 0.9, run_mult: 0.8 },
  inswinger: { wicket_mult: 1.15, run_mult: 0.9 },
  outswinger: { wicket_mult: 1.15, run_mult: 0.9 },
};

const SHOT_BALL_COMPATIBILITY = {
  // --- BASE DELIVERIES (Fallbacks and Spinners) ---
  bouncer: {
    leave: 0.9, defend: 0.4, pull: 0.85, hook: 0.85, upper_cut: 0.75,
    cut: 0.5, slog: 0.3, sweep: 0.05, flick: 0.1,
    straight_drive: 0.1, cover_drive: 0.15, loft: 0.3,
  },
  yorker: {
    defend: 0.8, flick: 0.75, straight_drive: 0.65, on_drive: 0.65,
    leave: 0.1, slog: 0.2, pull: 0.05, hook: 0.02, sweep: 0.1, cut: 0.05,
    paddle: 0.4, drive_on_the_up: 0.15, loft: 0.1,
  },
  full_length: {
    straight_drive: 0.9, cover_drive: 0.85, on_drive: 0.8, off_drive: 0.8,
    flick: 0.75, defend: 0.75, leave: 0.5, loft: 0.7,
    pull: 0.2, hook: 0.1, sweep: 0.3, slog: 0.5,
  },
  short: {
    pull: 0.9, hook: 0.8, cut: 0.85, square_cut: 0.85, upper_cut: 0.75,
    leave: 0.8, defend: 0.5, slog: 0.5,
    straight_drive: 0.1, cover_drive: 0.3, sweep: 0.1,
  },
  good_length: {
    defend: 0.9, leave: 0.8, straight_drive: 0.7, cover_drive: 0.75,
    off_drive: 0.7, on_drive: 0.65, flick: 0.6, cut: 0.4,
    pull: 0.35, slog: 0.3, loft: 0.35, drive_on_the_up: 0.7,
  },

  // --- FAST BOWLERS COMPOUND VARIATIONS ---

  // 1. Yorker Variations
  fast_yorker: {
    defend: 0.85, flick: 0.4, straight_drive: 0.3, leave: 0.01,
    pull: 0.01, sweep: 0.01, cut: 0.01, loft: 0.05
  },
  normal_yorker: {
    defend: 0.80, flick: 0.75, straight_drive: 0.65, leave: 0.05,
    pull: 0.05, sweep: 0.1, cut: 0.05, loft: 0.1
  },
  slow_yorker: {
    straight_drive: 0.85, flick: 0.80, defend: 0.70, loft: 0.75,
    pull: 0.1, sweep: 0.3, cut: 0.2, leave: 0.3
  },
  inswinger_yorker: {
    flick: 0.90, defend: 0.80, straight_drive: 0.50, leave: 0.01,
    pull: 0.05, sweep: 0.15, cut: 0.02, loft: 0.1
  },
  outswinger_yorker: {
    leave: 0.90, defend: 0.80, straight_drive: 0.55, flick: 0.20,
    pull: 0.02, sweep: 0.05, cut: 0.15, loft: 0.1
  },

  // 2. Full Length Variations
  fast_full_length: {
    straight_drive: 0.85, defend: 0.80, flick: 0.65, loft: 0.60,
    leave: 0.4, pull: 0.1, sweep: 0.1, cut: 0.3
  },
  normal_full_length: {
    straight_drive: 0.90, defend: 0.75, flick: 0.75, loft: 0.70,
    leave: 0.5, pull: 0.2, sweep: 0.3, cut: 0.4
  },
  slow_full_length: {
    loft: 0.90, straight_drive: 0.85, flick: 0.80, defend: 0.65,
    pull: 0.50, sweep: 0.60, cut: 0.50, leave: 0.5
  },
  inswinger_full_length: {
    flick: 0.90, straight_drive: 0.80, defend: 0.75, sweep: 0.50,
    leave: 0.3, pull: 0.2, cut: 0.15, loft: 0.6
  },
  outswinger_full_length: {
    straight_drive: 0.85, leave: 0.80, defend: 0.75, cut: 0.50,
    flick: 0.2, pull: 0.1, sweep: 0.1, loft: 0.5
  },

  // 3. Good Length Variations
  fast_good_length: {
    defend: 0.90, leave: 0.85, straight_drive: 0.55, flick: 0.45,
    pull: 0.2, sweep: 0.05, cut: 0.3, loft: 0.2
  },
  normal_good_length: {
    defend: 0.85, leave: 0.80, straight_drive: 0.70, flick: 0.60,
    pull: 0.35, sweep: 0.1, cut: 0.4, loft: 0.3
  },
  slow_good_length: {
    straight_drive: 0.85, loft: 0.80, defend: 0.70, flick: 0.65,
    pull: 0.5, sweep: 0.3, cut: 0.5, leave: 0.7
  },
  inswinger_good_length: {
    defend: 0.85, flick: 0.80, straight_drive: 0.60, leave: 0.40,
    pull: 0.3, sweep: 0.2, cut: 0.15, loft: 0.3
  },
  outswinger_good_length: {
    leave: 0.95, defend: 0.85, straight_drive: 0.50, cut: 0.60,
    flick: 0.15, pull: 0.2, sweep: 0.1, loft: 0.3
  },

  // 4. Short Variations
  fast_short: {
    pull: 0.85, leave: 0.80, cut: 0.65, defend: 0.40,
    straight_drive: 0.1, flick: 0.1, sweep: 0.05, loft: 0.3
  },
  normal_short: {
    pull: 0.90, cut: 0.85, leave: 0.75, defend: 0.50,
    straight_drive: 0.2, flick: 0.3, sweep: 0.1, loft: 0.4
  },
  slow_short: {
    pull: 0.95, cut: 0.90, loft: 0.85, defend: 0.60,
    straight_drive: 0.4, flick: 0.5, sweep: 0.2, leave: 0.6
  },
  inswinger_short: {
    pull: 0.90, defend: 0.60, leave: 0.70, flick: 0.65,
    cut: 0.4, straight_drive: 0.15, sweep: 0.1, loft: 0.3
  },
  outswinger_short: {
    cut: 0.90, leave: 0.85, pull: 0.75, defend: 0.60,
    straight_drive: 0.2, flick: 0.1, sweep: 0.05, loft: 0.4
  },

  // 5. Bouncer Variations
  fast_bouncer: {
    leave: 0.95, pull: 0.75, defend: 0.20, cut: 0.40,
    straight_drive: 0.01, flick: 0.05, sweep: 0.01, loft: 0.25
  },
  normal_bouncer: {
    leave: 0.90, pull: 0.80, defend: 0.35, cut: 0.50,
    straight_drive: 0.05, flick: 0.1, sweep: 0.02, loft: 0.3
  },
  slow_bouncer: {
    pull: 0.90, leave: 0.80, loft: 0.75, defend: 0.50,
    cut: 0.6, straight_drive: 0.1, flick: 0.2, sweep: 0.05
  },
  inswinger_bouncer: {
    leave: 0.90, pull: 0.80, defend: 0.30, cut: 0.35,
    straight_drive: 0.02, flick: 0.1, sweep: 0.01, loft: 0.25
  },
  outswinger_bouncer: {
    leave: 0.95, pull: 0.70, cut: 0.60, defend: 0.30,
    straight_drive: 0.02, flick: 0.05, sweep: 0.01, loft: 0.25
  },

  // --- SPINNERS ---
  off_cutter: {
    defend: 0.8, leave: 0.7, cut: 0.65, cover_drive: 0.6,
    flick: 0.4, pull: 0.3, slog: 0.2, sweep: 0.15,
  },
  leg_cutter: {
    defend: 0.8, leave: 0.7, flick: 0.7, on_drive: 0.6,
    glance: 0.7, pull: 0.3, cut: 0.25, sweep: 0.2,
  },
  slower_ball: {
    loft: 0.8, straight_drive: 0.75, cover_drive: 0.7, defend: 0.7,
    slog: 0.65, pull: 0.5, cut: 0.45, sweep: 0.4,
    drive_on_the_up: 0.85, leave: 0.6,
  },
  inswinger: {
    flick: 0.85, defend: 0.8, on_drive: 0.75, straight_drive: 0.65,
    leave: 0.5, glance: 0.75, paddle: 0.7,
    cut: 0.15, cover_drive: 0.2, pull: 0.2,
  },
  outswinger: {
    leave: 0.9, defend: 0.8, cover_drive: 0.75, off_drive: 0.7,
    cut: 0.65, late_cut: 0.75, straight_drive: 0.55,
    flick: 0.15, on_drive: 0.15, pull: 0.2,
  },
  off_break: {
    sweep: 0.85, defend: 0.8, slog_sweep: 0.75, straight_drive: 0.7,
    flick: 0.75, on_drive: 0.7, reverse_sweep: 0.65,
    loft: 0.6, slog: 0.5, cut: 0.3, leave: 0.6,
  },
  carrom_ball: {
    defend: 0.75, flick: 0.7, cut: 0.6, sweep: 0.65,
    straight_drive: 0.55, leave: 0.6, slog: 0.4,
  },
  arm_ball: {
    straight_drive: 0.8, defend: 0.75, flick: 0.75, on_drive: 0.7,
    sweep: 0.6, loft: 0.6, leave: 0.6, slog: 0.5,
  },
  doosra: {
    leave: 0.75, defend: 0.7, cover_drive: 0.65, cut: 0.65,
    sweep: 0.55, reverse_sweep: 0.65, flick: 0.4,
  },
  top_spinner_off: {
    straight_drive: 0.75, defend: 0.75, sweep: 0.7, flick: 0.65,
    loft: 0.6, slog: 0.5, leave: 0.6,
  },
  leg_break: {
    cut: 0.85, sweep: 0.8, defend: 0.8, cover_drive: 0.75,
    straight_drive: 0.6, slog_sweep: 0.75, reverse_sweep: 0.7,
    loft: 0.6, slog: 0.5, leave: 0.7, flick: 0.6,
  },
  googly: {
    flick: 0.75, defend: 0.7, on_drive: 0.7, sweep: 0.65,
    leave: 0.55, pad_up: 0.4, slog: 0.4, cut: 0.35,
  },
  flipper: {
    defend: 0.75, cut: 0.75, straight_drive: 0.65, sweep: 0.5,
    leave: 0.5, pull: 0.4, slog: 0.4,
  },
  top_spinner_leg: {
    pull: 0.8, defend: 0.75, straight_drive: 0.7, sweep: 0.65,
    loft: 0.65, slog: 0.55, leave: 0.6, flick: 0.6,
  },
  slider: {
    defend: 0.8, leave: 0.75, cut: 0.7, cover_drive: 0.65,
    straight_drive: 0.6, sweep: 0.55, slog: 0.45,
  },
  mystery_ball: {
    defend: 0.6, leave: 0.5, sweep: 0.5, slog_sweep: 0.5,
    reverse_sweep: 0.4, flick: 0.4, slog: 0.5, loft: 0.5,
    straight_drive: 0.45, cover_drive: 0.45, on_drive: 0.45,
    pull: 0.4, cut: 0.4, square_cut: 0.4, hook: 0.35,
  },
};

const DEFAULT_COMPATIBILITY = 0.2;

const STARTER_PACK = {
  totalPlayers: 11,
  starPlayerOvr: 84,
  lowOvrMin: 55,
  lowOvrMax: 70,
  composition: {
    batsman: 4,
    wicket_keeper: 1,
    bowler: 3,
    all_rounder: 2,
    star: 1,
  },
};

const DISCONNECT_PENALTY_COINS = 2000;
const COMPENSATION_PER_OVER_PLAYED = 500;

function getMaxOversPerBowler(totalOvers) {
  if (totalOvers <= 5) return 1;
  if (totalOvers <= 10) return 2;
  if (totalOvers <= 15) return 3;
  return 4;
}

const SQUAD_RULES = {
  MIN_BATSMEN, MAX_BATSMEN, MIN_BOWLERS, MAX_BOWLERS, MIN_WICKET_KEEPERS, MIN_ALL_ROUNDERS
};

module.exports = {
  SQUAD_MAX_SIZE,
  PLAYING_XI_SIZE,
  MIN_BATSMEN,
  MAX_BATSMEN,
  MIN_BOWLERS,
  MAX_BOWLERS,
  MIN_WICKET_KEEPERS,
  MIN_ALL_ROUNDERS,
  STARTING_COINS,
  DROP_COOLDOWN_MS,
  DAILY_REWARD_COOLDOWN_MS,
  SELL_PRICE_RATIO,
  WINNER_REWARD_PER_OVER,
  LOSER_REWARD_PER_OVER,
  MIN_OVERS,
  MAX_OVERS,
  BALLS_PER_OVER,
  TOSS_TIMER_S,
  XI_SELECTION_TIMER_S,
  TURN_TIMER_S,
  MAX_TIMEOUTS,
  TOSS_TIMER_MS,
  XI_SELECTION_TIMER_MS,
  BALL_TIMER_MS,
  DROP_COIN_CHANCE,
  DROP_CARD_CHANCE,
  DROP_MIN_CARD_OVR,
  DROP_MAX_CARD_OVR,
  DROP_COIN_MIN,
  DROP_COIN_MAX,
  DROP_OVR_WEIGHTS,
  DAILY_COIN_MIN,
  DAILY_COIN_MAX,
  DAILY_CARD_CHANCE,
  DAILY_MAX_CARD_OVR,
  getPlayerPrice,
  PITCH_TYPES,
  FAST_DELIVERIES,
  FAST_VARIATIONS,
  OFF_SPIN_DELIVERIES,
  LEG_SPIN_DELIVERIES,
  DELIVERY_SPEEDS,
  CORE_SHOTS,
  BATTING_SHOTS,
  SHOTS,
  SHOT_CATEGORIES,
  DELIVERIES,
  SPEED_OPTIONS,
  PITCH_FACTORS,
  SPEED_FACTORS,
  SHOT_BALL_COMPATIBILITY,
  DEFAULT_COMPATIBILITY,
  STARTER_PACK,
  DISCONNECT_PENALTY_COINS,
  COMPENSATION_PER_OVER_PLAYED,
  getMaxOversPerBowler,
  SQUAD_RULES
};
