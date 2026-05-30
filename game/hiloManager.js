const stats = require('../data/hiloStats.json');

const activeGames = new Map();
const sb = require('../db/supabase');

function getRandomPlayer(seenPlayersList = []) {
  let pool = stats;
  if (seenPlayersList.length > 0) pool = stats.filter(p => !seenPlayersList.includes(p.name));
  
  // Failsafe if they manage to see all 32 players (insane luck)
  if (pool.length === 0) pool = stats; 
  
  return pool[Math.floor(Math.random() * pool.length)];
}

function getRandomConstraint(player) {
  const keys = Object.keys(player).filter(k => k !== 'name');
  return keys[Math.floor(Math.random() * keys.length)];
}

function createGame(userId, betAmount) {
  const p1 = getRandomPlayer([]);
  const seenPlayers = [p1.name];
  const p2 = getRandomPlayer(seenPlayers);
  seenPlayers.push(p2.name);
  
  const constraint = getRandomConstraint(p1);
  
  const state = {
    userId,
    betAmount,
    multiplier: 1.0,
    currentPlayer: p1,
    nextPlayer: p2,
    constraint: constraint,
    seenPlayers: seenPlayers,
    messageId: null
  };
  
  activeGames.set(userId, state);
  sb.saveHiloGame(state); // Sync to DB
  return state;
}

async function getGame(userId) {
  let state = activeGames.get(userId);
  if (!state) {
    // Try loading from DB if in-memory is missing (e.g. after restart)
    state = await sb.getHiloGame(userId);
    if (state) activeGames.set(userId, state);
  }
  return state;
}

function getActiveGames() {
  return activeGames;
}

function getActiveGamesCount() {
  return activeGames.size;
}

function endGame(userId) {
  activeGames.delete(userId);
  sb.deleteHiloGame(userId); // Remove from DB
}

function calculateIncrement(basePlayer, constraint, guess) {
  const baseVal = basePlayer[constraint];
  const total = stats.length;
  
  let winCount = 0;
  if (guess === 'higher') {
    winCount = stats.filter(p => p[constraint] > baseVal).length;
  } else {
    winCount = stats.filter(p => p[constraint] < baseVal).length;
  }

  // Probability of winning
  const prob = winCount / total;
  
  // Difficulty is Inverse Probability
  // If prob is 0.9 (easy), diff is 0.1
  // If prob is 0.1 (hard), diff is 0.9
  const diff = 1 - prob;

  // Multiplier increment between 0.01 and 0.40
  // Scaling: increment = 0.01 + (diff * 0.39)
  let increment = 0.01 + (diff * 0.39);
  
  return parseFloat(increment.toFixed(3));
}

function nextRound(userId, guess) {
  const state = activeGames.get(userId);
  if (!state) return null;
  
  // Calculate dynamic multiplier increase based on the PREVIOUS base and the guess made
  const increment = calculateIncrement(state.currentPlayer, state.constraint, guess);
  state.multiplier = parseFloat((state.multiplier + increment).toFixed(3));
  
  // Carry over the target player to be the new base player
  state.currentPlayer = state.nextPlayer;
  
  // Pick a new target player ensuring it's not a previously seen player
  state.nextPlayer = getRandomPlayer(state.seenPlayers);
  state.seenPlayers.push(state.nextPlayer.name);
  
  sb.saveHiloGame(state); // Sync to DB
  return state;
}

function nextRoundDraw(userId) {
  const state = activeGames.get(userId);
  if (!state) return null;
  
  state.currentPlayer = state.nextPlayer;
  state.nextPlayer = getRandomPlayer(state.seenPlayers);
  state.seenPlayers.push(state.nextPlayer.name);
  
  // Constraint remains the same!
  sb.saveHiloGame(state); // Sync to DB
  return state;
}

module.exports = {
  createGame,
  getGame,
  getActiveGamesCount,
  endGame,
  nextRound,
  nextRoundDraw,
  getActiveGames
};
