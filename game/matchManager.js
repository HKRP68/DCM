const gameConstants = require('../constants/game');
const { calculateBallOutcome } = require('./engine');
const ai = require('./ai');
const sb = require('../db/supabase');

// Active matches in-memory store
// Key: chatId, telegramUserId, or matchId
const activeMatches = {};
const completedMatches = {};

const DEFAULT_XI = [
  { id: 'def_1', name: 'V. Kohli', ovr: 90, batting_rating: 90, bowling_rating: 15, batting_hand: 'right', role: 'batsman', batting_archetype: 'Anchor' },
  { id: 'def_2', name: 'R. Sharma', ovr: 88, batting_rating: 88, bowling_rating: 10, batting_hand: 'right', role: 'batsman', batting_archetype: 'Opener' },
  { id: 'def_3', name: 'S. Gill', ovr: 85, batting_rating: 85, bowling_rating: 10, batting_hand: 'right', role: 'batsman', batting_archetype: 'Opener' },
  { id: 'def_4', name: 'S. Yadav', ovr: 87, batting_rating: 87, bowling_rating: 10, batting_hand: 'right', role: 'batsman', batting_archetype: 'Brute' },
  { id: 'def_5', name: 'H. Pandya', ovr: 86, batting_rating: 84, bowling_rating: 82, batting_hand: 'right', role: 'all_rounder', batting_archetype: 'Finisher', bowler_type: 'fast' },
  { id: 'def_6', name: 'R. Jadeja', ovr: 86, batting_rating: 82, bowling_rating: 85, batting_hand: 'left', role: 'all_rounder', batting_archetype: 'Finisher', bowler_type: 'off_spin' },
  { id: 'def_7', name: 'K. Rahul', ovr: 85, batting_rating: 85, bowling_rating: 10, batting_hand: 'right', role: 'wicket_keeper', batting_archetype: 'Anchor' },
  { id: 'def_8', name: 'J. Bumrah', ovr: 92, batting_rating: 20, bowling_rating: 95, batting_hand: 'right', role: 'bowler', bowler_type: 'fast', batting_archetype: 'Tailender' },
  { id: 'def_9', name: 'M. Siraj', ovr: 84, batting_rating: 15, bowling_rating: 84, batting_hand: 'right', role: 'bowler', bowler_type: 'fast', batting_archetype: 'Tailender' },
  { id: 'def_10', name: 'K. Yadav', ovr: 85, batting_rating: 15, bowling_rating: 85, batting_hand: 'right', role: 'bowler', bowler_type: 'leg_spin', batting_archetype: 'Tailender' },
  { id: 'def_11', name: 'R. Ashwin', ovr: 84, batting_rating: 68, bowling_rating: 84, batting_hand: 'right', role: 'bowler', bowler_type: 'off_spin', batting_archetype: 'Tailender' }
];

class Match {
  constructor({ id, type, chatId, totalOvers, pitch, host, guest }) {
    this.id = id; 
    this.type = type; // 'pvp' or 'pve'
    this.chatId = chatId;
    this.totalOvers = totalOvers;
    this.pitch = pitch;
    
    this.host = host; 
    this.guest = guest; 

    // Clone and map XI to have unique player IDs to prevent shared stats bugs
    if (this.host && this.host.xi) {
      this.host.xi = this.host.xi.map(p => ({
        ...p,
        id: `host_${p.id}`
      }));
    }
    if (this.guest && this.guest.xi) {
      this.guest.xi = this.guest.xi.map(p => ({
        ...p,
        id: `guest_${p.id}`
      }));
    }

    this.status = 'toss'; // toss -> bat_or_bowl -> xi_selection -> innings1 -> innings2 -> completed
    this.tossWinnerId = null;
    this.tossDecision = null; // 'bat' or 'bowl'

    this.innings = [
      {
        battingId: null,
        bowlingId: null,
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: 0,
        target: null
      },
      {
        battingId: null,
        bowlingId: null,
        runs: 0,
        wickets: 0,
        balls: 0,
        extras: 0,
        target: null
      }
    ];
    this.currentInningsIdx = 0;

    // Crease state
    this.strikerIdx = null;
    this.nonStrikerIdx = null;
    this.currentBowlerIdx = null; 
    this.nextBatsmanIdx = 2; // Index of the next batsman to walk in (defaults to 2 after openers)

    this.stats = {};

    this.currentDelivery = null;
    this.currentSpeed = null;
    this.currentShot = null;

    this.commentary = [];
    this.lastBallOutcome = null;
    this.partnership = { runs: 0, balls: 0 };
    this.lastOverEndRuns = 0;
    this.lastBowlerId = null; // Fixed consecutive bowler tracking across innings

    this.hostConfirmed = false;
    this.guestConfirmed = false;
    this.activeScorecardMessageId = null;
    this.lastActivity = Date.now();
  }

  get currentInnings() {
    return this.innings[this.currentInningsIdx];
  }

  get battingTeam() {
    if (this.currentInningsIdx === 0 && (this.status === 'xi_selection' || this.status === 'toss' || this.status === 'bat_or_bowl')) {
      if (!this.tossWinnerId || !this.tossDecision) return this.host;
      const isWinnerHost = this.tossWinnerId.toString() === this.host.telegramId.toString();
      const battingTeam = isWinnerHost
        ? (this.tossDecision === 'bat' ? this.host : this.guest)
        : (this.tossDecision === 'bat' ? this.guest : this.host);
      return battingTeam;
    }
    const current = this.currentInnings;
    const isBattingHost = current.battingId && this.host.telegramId && (current.battingId.toString() === this.host.telegramId.toString());
    return isBattingHost ? this.host : this.guest;
  }

  get bowlingTeam() {
    if (this.currentInningsIdx === 0 && (this.status === 'xi_selection' || this.status === 'toss' || this.status === 'bat_or_bowl')) {
      const batting = this.battingTeam;
      const isBattingHost = batting.telegramId && this.host.telegramId && (batting.telegramId.toString() === this.host.telegramId.toString());
      return isBattingHost ? this.guest : this.host;
    }
    const current = this.currentInnings;
    const isBowlingHost = current.bowlingId && this.host.telegramId && (current.bowlingId.toString() === this.host.telegramId.toString());
    return isBowlingHost ? this.host : this.guest;
  }

  get striker() {
    return this.strikerIdx !== null && this.battingTeam ? this.battingTeam.xi[this.strikerIdx] : null;
  }

  get nonStriker() {
    return this.nonStrikerIdx !== null && this.battingTeam ? this.battingTeam.xi[this.nonStrikerIdx] : null;
  }

  get currentBowler() {
    return this.currentBowlerIdx !== null && this.bowlingTeam ? this.bowlingTeam.xi[this.currentBowlerIdx] : null;
  }

  startFirstInnings({ strikerIdx, nonStrikerIdx, bowlerIdx } = {}) {
    const isHostWinner = this.tossWinnerId && this.host.telegramId && (this.tossWinnerId.toString() === this.host.telegramId.toString());
    const battingTeam = isHostWinner
      ? (this.tossDecision === 'bat' ? this.host : this.guest)
      : (this.tossDecision === 'bat' ? this.guest : this.host);

    const isBattingHost = battingTeam.telegramId && this.host.telegramId && (battingTeam.telegramId.toString() === this.host.telegramId.toString());
    const bowlingTeam = isBattingHost ? this.guest : this.host;

    this.innings[0].battingId = battingTeam.telegramId;
    this.innings[0].bowlingId = bowlingTeam.telegramId;
    this.currentInningsIdx = 0;
    this.status = 'innings1';
    
    this.strikerIdx = strikerIdx !== undefined ? strikerIdx : 0;
    this.nonStrikerIdx = nonStrikerIdx !== undefined ? nonStrikerIdx : 1;
    
    this.nextBatsmanIdx = 0;
    while (this.nextBatsmanIdx === this.strikerIdx || this.nextBatsmanIdx === this.nonStrikerIdx) {
      this.nextBatsmanIdx++;
    }
    
    if (bowlerIdx !== undefined) {
      this.currentBowlerIdx = bowlerIdx;
    } else {
      this.selectBestBowler();
    }

    this.initPlayerStats(battingTeam.xi);
    this.initPlayerStats(bowlingTeam.xi);

    this.turnState = 'bowling_delivery';

    this.commentary = [];
    this.lastBallOutcome = null;
    this.partnership = { runs: 0, balls: 0 };
    this.lastOverEndRuns = 0;
    this.lastBowlerId = null;
  }

  startSecondInnings() {
    const prevInnings = this.innings[0];
    const isHostBowling = this.innings[0].bowlingId && this.host.telegramId && (this.innings[0].bowlingId.toString() === this.host.telegramId.toString());
    const battingTeam = isHostBowling ? this.host : this.guest;
    const isBattingHost = battingTeam.telegramId && this.host.telegramId && (battingTeam.telegramId.toString() === this.host.telegramId.toString());
    const bowlingTeam = isBattingHost ? this.guest : this.host;

    this.innings[1].battingId = battingTeam.telegramId;
    this.innings[1].bowlingId = bowlingTeam.telegramId;
    this.innings[1].target = prevInnings.runs + 1;
    this.currentInningsIdx = 1;
    this.status = 'innings2';

    this.strikerIdx = null;
    this.nonStrikerIdx = null;
    this.nextBatsmanIdx = 0;
    this.currentBowlerIdx = null;
    this.lastBowlerId = null; // Reset for new innings

    this.hostConfirmed = false;
    this.guestConfirmed = false;

    if (this.type === 'pvp') {
      this.status = 'xi_selection';
      this.turnState = 'selecting_wicket_batsman'; 
    } else {
      // PvE/AI: Auto-select AI roles
      if (battingTeam.telegramId === 'ai') {
        this.strikerIdx = 0;
        this.nonStrikerIdx = 1;
        this.nextBatsmanIdx = 2;
      }
      if (bowlingTeam.telegramId === 'ai') {
        this.selectBestBowler();
      }

      const humanNeedsSelect = (battingTeam.telegramId !== 'ai' && this.strikerIdx === null) || 
                               (bowlingTeam.telegramId !== 'ai' && this.currentBowlerIdx === null);
      if (humanNeedsSelect) {
        this.status = 'xi_selection';
        this.turnState = 'selecting_wicket_batsman';
      } else {
        this.turnState = 'bowling_delivery';
      }
    }
  }

  initPlayerStats(xi) {
    xi.forEach(p => {
      if (!this.stats[p.id]) {
        this.stats[p.id] = { runs: 0, balls: 0, fours: 0, sixes: 0, overs: 0, runsConceded: 0, wickets: 0 };
      }
    });
  }

  isBowlerEligible(bowlerIdx) {
    const bowlers = this.bowlingTeam.xi;
    const bowler = bowlers[bowlerIdx];
    if (!bowler) return false;

    // A bowler cannot bowl consecutive overs (checked by ID instead of index)
    if (this.lastBowlerId && bowler.id === this.lastBowlerId) return false;

    // A bowler cannot exceed their maximum overs limit
    const maxOvers = gameConstants.getMaxOversPerBowler(this.totalOvers);
    const stats = this.stats[bowler.id] || { overs: 0 };
    if (stats.overs >= maxOvers) {
      // Fallback check: if ALL other bowlers have also exceeded limits
      const otherEligible = bowlers.some((p, idx) => {
        const statsP = this.stats[p.id] || { overs: 0 };
        return p.id !== bowler.id && (!this.lastBowlerId || p.id !== this.lastBowlerId) && statsP.overs < maxOvers;
      });

      if (otherEligible) return false;
    }

    return true;
  }

  getEligibleBowlerIndices() {
    const indices = [];
    this.bowlingTeam.xi.forEach((p, idx) => {
      if (this.isBowlerEligible(idx)) {
        indices.push(idx);
      }
    });
    return indices;
  }

  selectBestBowler() {
    const indices = this.getEligibleBowlerIndices();
    if (indices.length === 0) {
      this.currentBowlerIdx = this.bowlingTeam.xi.length - 1; // absolute fallback
      return;
    }
    // AI selects bowler with highest bowling rating
    let bestIdx = indices[0];
    let bestRating = -1;
    indices.forEach(idx => {
      const p = this.bowlingTeam.xi[idx];
      const rating = p.bowling_rating || 50;
      if (rating > bestRating) {
        bestRating = rating;
        bestIdx = idx;
      }
    });
    this.currentBowlerIdx = bestIdx;
  }

  bowlBall() {
    const outcome = calculateBallOutcome(
      this.striker,
      this.currentBowler,
      this.currentDelivery,
      this.currentShot,
      this.pitch,
      this.currentSpeed,
      this.bowlingTeam.xi,
      {
        overNumber: Math.floor(this.currentInnings.balls / 6),
        totalOvers: this.totalOvers,
        batsmanStats: this.stats[this.striker.id],
        bowlerStats: this.stats[this.currentBowler.id]
      }
    );

    const current = this.currentInnings;
    current.balls += 1;

    const batStats = this.stats[this.striker.id];
    batStats.balls += 1;

    const bowlStats = this.stats[this.currentBowler.id];
    const currentBallsBowled = Math.round((bowlStats.overs % 1) * 10) + Math.floor(bowlStats.overs) * 6 + 1;
    const completedOvers = Math.floor(currentBallsBowled / 6);
    const fraction = currentBallsBowled % 6;
    bowlStats.overs = completedOvers + (fraction / 10);

    if (outcome.isWicket) {
      current.wickets += 1;
      bowlStats.wickets += 1;
      
      this.stats[this.striker.id].isOut = true;
      this.stats[this.striker.id].outDetail = outcome.wicketDetail;
      
      if (this.type === 'pve') {
        if (this.nextBatsmanIdx < 11) {
          this.strikerIdx = this.nextBatsmanIdx;
          this.nextBatsmanIdx += 1;
        }
      }
    } else {
      current.runs += outcome.runs;
      batStats.runs += outcome.runs;
      bowlStats.runsConceded += outcome.runs;
      
      if (outcome.runs === 4) batStats.fours += 1;
      if (outcome.runs === 6) batStats.sixes += 1;

      if (outcome.runs === 1 || outcome.runs === 3) {
        const temp = this.strikerIdx;
        this.strikerIdx = this.nonStrikerIdx;
        this.nonStrikerIdx = temp;
      }
    }

    const overCompleted = current.balls % 6 === 0;
    if (overCompleted && current.balls < this.totalOvers * 6 && current.wickets < 10) {
      if (outcome.isWicket && this.type !== 'pve') {
        // Defer swap for PvP wicket since new batsman is not selected yet
      } else {
        const temp = this.strikerIdx;
        this.strikerIdx = this.nonStrikerIdx;
        this.nonStrikerIdx = temp;
        
        this.lastBowlerId = this.currentBowler.id; // Track consecutive bowler
        this.currentBowlerIdx = null; 

        if (this.type === 'pve') {
          this.selectBestBowler();
        }
      }
    }

    this.currentDelivery = null;
    this.currentSpeed = null;
    this.currentShot = null;

    this.lastBallOutcome = outcome;
    if (outcome.isWicket) {
      this.partnership = { runs: 0, balls: 0 };
    } else {
      this.partnership.runs += outcome.runs;
      this.partnership.balls += 1;
    }

    return outcome;
  }

  checkInningsEnded() {
    const current = this.currentInnings;
    if (this.status === 'innings1') {
      return current.wickets >= 10 || current.balls >= this.totalOvers * 6;
    }
    if (this.status === 'innings2') {
      const targetChased = current.runs >= current.target;
      const allOut = current.wickets >= 10;
      const oversFinished = current.balls >= this.totalOvers * 6;
      return targetChased || allOut || oversFinished;
    }
    return false;
  }

  async finalizeMatch() {
    this.status = 'completed';
    
    const inn1 = this.innings[0];
    const inn2 = this.innings[1];

    let winner = null;
    let loser = null;

    if (inn2.runs >= inn2.target) {
      winner = this.battingTeam;
      loser = this.bowlingTeam;
    } else if (inn2.runs < inn1.runs) {
      const isHostBatting1 = this.innings[0].battingId && this.host.telegramId && (this.innings[0].battingId.toString() === this.host.telegramId.toString());
      winner = isHostBatting1 ? this.host : this.guest;
      const isWinnerHost = winner.telegramId && this.host.telegramId && (winner.telegramId.toString() === this.host.telegramId.toString());
      loser = isWinnerHost ? this.guest : this.host;
    }

    const winnerReward = this.totalOvers * gameConstants.WINNER_REWARD_PER_OVER;
    const loserReward = this.totalOvers * gameConstants.LOSER_REWARD_PER_OVER;

    let bestPlayerId = null;
    let bestScore = -1;
    const winningPlayerIds = new Set((winner && winner.xi) ? winner.xi.map(p => p.id) : []);

    for (const [pid, pStats] of Object.entries(this.stats)) {
      if (winningPlayerIds.size > 0 && !winningPlayerIds.has(pid)) {
        continue;
      }
      const score = pStats.runs + pStats.wickets * 25;
      if (score > bestScore) {
        bestScore = score;
        bestPlayerId = pid;
      }
    }

    let motmPlayer = null;
    let motmStats = null;
    if (bestPlayerId) {
      motmPlayer = this.host.xi.find(p => p.id === bestPlayerId) || 
                   (this.guest ? this.guest.xi.find(p => p.id === bestPlayerId) : null);
      motmStats = this.stats[bestPlayerId];
    }

    // Award rewards directly in the database
    if (winner && winner.telegramId !== 'ai') {
      await sb.addCoins(winner.telegramId, winnerReward).catch(e => console.error("Failed to add coins to winner:", e));
      await sb.recordWin(winner.telegramId, 'cricket').catch(e => console.error("Failed to record win:", e));
    }
    if (loser && loser.telegramId !== 'ai') {
      await sb.addCoins(loser.telegramId, loserReward).catch(e => console.error("Failed to add coins to loser:", e));
      await sb.recordLoss(loser.telegramId, 'cricket').catch(e => console.error("Failed to record loss:", e));
    }

    // Sync to Supabase
    saveToDb(this);

    // Cleanup active match
    delete activeMatches[this.host.telegramId];
    delete activeMatches[this.id];
    if (this.guest && this.guest.telegramId !== 'ai') {
      delete activeMatches[this.guest.telegramId];
    }

    // Cache completed match for 5 minutes
    completedMatches[this.id] = this;
    completedMatches[this.host.telegramId] = this;
    if (this.guest && this.guest.telegramId !== 'ai') {
      completedMatches[this.guest.telegramId] = this;
    }

    setTimeout(() => {
      delete completedMatches[this.id];
      delete completedMatches[this.host.telegramId];
      if (this.guest && this.guest.telegramId !== 'ai') {
        delete completedMatches[this.guest.telegramId];
      }
    }, 5 * 60 * 1000);

    return {
      winner,
      loser,
      winnerReward,
      loserReward,
      inn1Runs: inn1.runs,
      inn1Wickets: inn1.wickets,
      inn1Overs: `${Math.floor(inn1.balls / 6)}.${inn1.balls % 6}`,
      inn2Runs: inn2.runs,
      inn2Wickets: inn2.wickets,
      inn2Overs: `${Math.floor(inn2.balls / 6)}.${inn2.balls % 6}`,
      motm: motmPlayer ? {
        name: motmPlayer.name,
        runs: motmStats.runs,
        balls: motmStats.balls,
        wickets: motmStats.wickets,
        overs: motmStats.overs
      } : null
    };
  }

  serialize() {
    return {
      id: this.id,
      type: this.type,
      chatId: this.chatId,
      totalOvers: this.totalOvers,
      pitch: this.pitch,
      host: this.host,
      guest: this.guest,
      status: this.status,
      tossWinnerId: this.tossWinnerId,
      tossDecision: this.tossDecision,
      innings: this.innings,
      currentInningsIdx: this.currentInningsIdx,
      strikerIdx: this.strikerIdx,
      nonStrikerIdx: this.nonStrikerIdx,
      currentBowlerIdx: this.currentBowlerIdx,
      nextBatsmanIdx: this.nextBatsmanIdx,
      stats: this.stats,
      currentDelivery: this.currentDelivery,
      currentSpeed: this.currentSpeed,
      currentShot: this.currentShot,
      commentary: this.commentary,
      lastBallOutcome: this.lastBallOutcome,
      partnership: this.partnership,
      lastOverEndRuns: this.lastOverEndRuns,
      lastBowlerId: this.lastBowlerId,
      hostConfirmed: this.hostConfirmed,
      guestConfirmed: this.guestConfirmed,
      activeScorecardMessageId: this.activeScorecardMessageId,
      lastActivity: this.lastActivity
    };
  }
}

function deserializeMatch(data) {
  const match = new Match({
    id: data.id,
    type: data.type,
    chatId: data.chatId,
    totalOvers: data.totalOvers,
    pitch: data.pitch,
    host: data.host,
    guest: data.guest
  });
  match.status = data.status;
  match.tossWinnerId = data.tossWinnerId;
  match.tossDecision = data.tossDecision;
  match.innings = data.innings;
  match.currentInningsIdx = data.currentInningsIdx;
  match.strikerIdx = data.strikerIdx;
  match.nonStrikerIdx = data.nonStrikerIdx;
  match.currentBowlerIdx = data.currentBowlerIdx;
  match.nextBatsmanIdx = data.nextBatsmanIdx;
  match.stats = data.stats;
  match.currentDelivery = data.currentDelivery;
  match.currentSpeed = data.currentSpeed;
  match.currentShot = data.currentShot;
  match.commentary = data.commentary;
  match.lastBallOutcome = data.lastBallOutcome;
  match.partnership = data.partnership;
  match.lastOverEndRuns = data.lastOverEndRuns;
  match.lastBowlerId = data.lastBowlerId;
  match.hostConfirmed = data.hostConfirmed;
  match.guestConfirmed = data.guestConfirmed;
  match.activeScorecardMessageId = data.activeScorecardMessageId;
  match.lastActivity = data.lastActivity || Date.now();
  return match;
}

function saveToDb(match) {
  match.lastActivity = Date.now();
  sb.saveCricketMatch(
    match.id, 
    match.chatId, 
    match.host.telegramId, 
    match.guest ? match.guest.telegramId : null, 
    match.status, 
    match.serialize()
  ).catch(e => console.error("[DB] Failed to save match state:", e));
}

async function loadActiveMatchesFromDb() {
  try {
    const matchesData = await sb.getActiveCricketMatches();
    if (matchesData && matchesData.length > 0) {
      console.log(`[DB] Restoring ${matchesData.length} active cricket matches from DB...`);
      for (const row of matchesData) {
        const state = row.state_json;
        if (state) {
          const match = deserializeMatch(state);
          activeMatches[match.id] = match;
          activeMatches[match.host.telegramId] = match;
          if (match.guest && match.guest.telegramId !== 'ai') {
            activeMatches[match.guest.telegramId] = match;
          }
        }
      }
      console.log(`[DB] Restored active matches into memory cache.`);
    }
  } catch (err) {
    console.error("[DB] Failed to load active matches from DB:", err);
  }
}

function createMatchFromLobby({ dbMatchId, lobby }) {
  const match = new Match({
    id: dbMatchId,
    type: 'pvp',
    chatId: lobby.chatId,
    totalOvers: lobby.overs,
    pitch: ['batting', 'bowling', 'balanced', 'spin', 'pace'][Math.floor(Math.random() * 5)],
    host: {
      telegramId: lobby.host.telegramId,
      username: lobby.host.username,
      teamName: lobby.host.teamName || `${lobby.host.username}'s XI`,
      xi: lobby.host.xi
    },
    guest: {
      telegramId: lobby.guest.telegramId,
      username: lobby.guest.username,
      teamName: lobby.guest.teamName || `${lobby.guest.username}'s XI`,
      xi: lobby.guest.xi
    }
  });

  match.tossWinnerId = lobby.tossWinner.telegramId;
  match.tossDecision = lobby.tossDecision;

  // Add to activeMatches maps
  activeMatches[lobby.host.telegramId] = match;
  activeMatches[lobby.guest.telegramId] = match;
  activeMatches[match.id] = match;

  saveToDb(match);

  return match;
}

function getActiveMatch(userIdOrChatId) {
  return activeMatches[userIdOrChatId] || null;
}

function getMatch(userIdOrChatId) {
  return activeMatches[userIdOrChatId] || completedMatches[userIdOrChatId] || null;
}

module.exports = {
  Match,
  activeMatches,
  completedMatches,
  deserializeMatch,
  saveToDb,
  loadActiveMatchesFromDb,
  createMatchFromLobby,
  getActiveMatch,
  getMatch,
  DEFAULT_XI
};
