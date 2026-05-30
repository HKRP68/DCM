const fs = require('fs');
const path = require('path');
const { InlineKeyboard } = require('grammy');

const lobbies = new Map();
const userLobbies = new Map();

function addUserLobby(userId, chatId) {
  if (!userLobbies.has(userId)) userLobbies.set(userId, new Set());
  userLobbies.get(userId).add(chatId);
}

function removeUserLobby(userId, chatId) {
  const s = userLobbies.get(userId);
  if (s) {
    s.delete(chatId);
    if (s.size === 0) userLobbies.delete(userId);
  }
}
const themesPath = path.join(__dirname, '../data/themes.json');
const themesData = JSON.parse(fs.readFileSync(themesPath, 'utf8'));

function getRoleDistribution(playerCount) {
  if (playerCount <= 5) return { impostors: 1, joker: 0 };   // 3-5: 1 impostor
  if (playerCount <= 7) return { impostors: 2, joker: 0 };   // 6-7: 2 impostors
  if (playerCount <= 10) return { impostors: 2, joker: 1 };  // 8-10: 2 impostors + joker
  if (playerCount <= 13) return { impostors: 3, joker: 1 };  // 11-13: 3 impostors + joker
  return { impostors: 4, joker: 1 };                         // 14+: 4 impostors + joker
}

class MafiaManager {
  hasLobby(chatId) { return lobbies.has(chatId); }
  getLobby(chatId) { return lobbies.get(chatId); }
  getActiveGamesCount() { return lobbies.size; }
  getLobbies() { return lobbies; }

  getLobbyByUserId(userId) {
    const chatIds = userLobbies.get(userId);
    if (!chatIds) return null;
    let fallback = null;
    for (const chatId of chatIds) {
      const lobby = lobbies.get(chatId);
      if (!lobby) continue;
      // Check both alivePlayers and all players for routing
      const isMember = (lobby.alivePlayers && lobby.alivePlayers.find(p => p.id === userId)) || 
                       (lobby.players && lobby.players.find(p => p.id === userId));
      if (isMember) {
        if (lobby.state === 'CLUE_PHASE') return lobby;
        fallback = lobby;
      }
    }
    return fallback;
  }

  getPlayerData(userId) {
    const lobby = this.getLobbyByUserId(userId);
    if (!lobby || lobby.state === 'LOBBY') return null;
    const role = lobby.roles[userId];
    if (!role) return null;
    return {
        mode: 'mafia',
        role,
        word: role === 'IMPOSTOR' ? lobby.wordB : (role === 'JOKER' ? null : lobby.wordA),
        theme: lobby.theme,
        maxWords: lobby.settings?.clue_words || 1,
        round: lobby.round
    };
  }


  createLobby(chatId, hostUser) {
    lobbies.set(chatId, {
      chatId,
      host: hostUser,
      players: [hostUser],
      alivePlayers: [],
      state: 'LOBBY',
      theme: null,
      round: 0,
      roles: {},
      wordA: null,
      wordB: null,
      cluesReceived: {},
      votes: {},
      jokerWon: false,
      eliminatedPlayers: [],
      settings: {},
      pinnedMessageId: null,
      clueStatusMessageId: null,
      anonymousVoting: false,
      createdAt: Date.now()
    });
    addUserLobby(hostUser.id, chatId);
  }

  joinLobby(chatId, user) {
    const lobby = lobbies.get(chatId);
    if (!lobby || lobby.state !== 'LOBBY') return false;
    if (lobby.players.find(p => p.id === user.id)) return false;
    lobby.players.push(user);
    addUserLobby(user.id, chatId);
    return true;
  }

  leaveLobby(chatId, userId) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return false;
    const idx = lobby.players.findIndex(p => p.id === userId);
    if (idx !== -1) { lobby.players.splice(idx, 1); removeUserLobby(userId, chatId); return true; }
    return false;
  }

  deleteLobby(chatId) {
    const lobby = lobbies.get(chatId);
    if (lobby) { lobby.players.forEach(p => removeUserLobby(p.id, chatId)); }
    lobbies.delete(chatId);
  }

  moveToThemeSelection(chatId) {
    const lobby = lobbies.get(chatId);
    if (lobby) lobby.state = 'THEME_SELECTION';
  }

  getAvailableThemes() { return Object.keys(themesData.themes); }
  getRoleDist(count) { return getRoleDistribution(count); }

  assignRoles(chatId) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return;
    const dist = getRoleDistribution(lobby.players.length);
    const shuffled = [...lobby.players].sort(() => Math.random() - 0.5);
    const roles = {};
    let idx = 0;
    for (let i = 0; i < dist.impostors; i++) { roles[shuffled[idx].id] = 'IMPOSTOR'; idx++; }
    for (let i = 0; i < dist.joker; i++) { roles[shuffled[idx].id] = 'JOKER'; idx++; }
    while (idx < shuffled.length) { roles[shuffled[idx].id] = 'CIVILIAN'; idx++; }
    lobby.roles = roles;
    lobby.alivePlayers = [...lobby.players];
    return roles;
  }

  async startRound(chatId, botInstance) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return false;
    lobby.round++;
    lobby.cluesReceived = {};
    lobby.votes = {};
    lobby.state = 'CLUE_PHASE';

    const themeClusters = themesData.themes[lobby.theme];
    const cluster = themeClusters[Math.floor(Math.random() * themeClusters.length)];
    let idxA = Math.floor(Math.random() * cluster.length);
    let idxB = Math.floor(Math.random() * cluster.length);
    while (idxB === idxA) { idxB = Math.floor(Math.random() * cluster.length); }
    const swap = Math.random() > 0.5;
    lobby.wordA = swap ? cluster[idxA] : cluster[idxB];
    lobby.wordB = swap ? cluster[idxB] : cluster[idxA];

    const maxW = lobby.settings.clue_words || 1;
    const clueLabel = maxW === 1 ? 'exactly ONE word' : `up to ${maxW} words`;

    for (let player of lobby.alivePlayers) {
      const role = lobby.roles[player.id];
      try {
        if (role === 'JOKER') {
          await botInstance.api.sendMessage(player.id,
            `🃏 <b>Mafia Round ${lobby.round}</b>\n\nTheme: <b>${lobby.theme}</b>\n\n🃏 <b>You are THE JOKER!</b>\nYou have no word. Your goal is to get voted out!\nBluff your way — reply with ${clueLabel} as your fake clue.`,
            { parse_mode: 'HTML' });
        } else {
          const word = role === 'IMPOSTOR' ? lobby.wordB : lobby.wordA;
          await botInstance.api.sendMessage(player.id,
            `🔫 <b>Mafia Round ${lobby.round}</b>\n\nTheme: <b>${lobby.theme}</b>\nYour Secret Word: <tg-spoiler>${word}</tg-spoiler>\n\nReply with ${clueLabel} to describe your word. Don't be too obvious!`,
            { parse_mode: 'HTML' });
        }
      } catch (err) {
        await botInstance.api.sendMessage(chatId,
          `⚠️ Could not DM <a href="tg://user?id=${player.id}">${player.first_name}</a>. Cancelling game...`,
          { parse_mode: 'HTML' });
        this.deleteLobby(chatId);
        return false;
      }
    }
    return true;
  }

  submitClue(userId, word) {
    const lobby = this.getLobbyByUserId(userId);
    if (!lobby) return { notFound: true };
    if (lobby.state !== 'CLUE_PHASE') return { error: "It's not time to submit clues right now." };
    if (lobby.cluesReceived[userId]) return { error: "You already submitted your clue!" };

    const maxWords = lobby.settings?.clue_words || 1;
    const wordCount = word.trim().split(/\s+/).length;
    if (wordCount > maxWords) {
      if (maxWords === 1) return { error: "Please send EXACTLY ONE word! Try again." };
      return { error: `Please send up to ${maxWords} words only! You sent ${wordCount}. Try again.` };
    }

    lobby.cluesReceived[userId] = word.trim();
    const allReceived = Object.keys(lobby.cluesReceived).length === lobby.alivePlayers.length;
    return { success: true, allReceived, lobby, mode: 'mafia' };
  }

  vote(chatId, voterId, targetId) {
    const lobby = this.getLobby(chatId);
    if (!lobby || lobby.state !== 'VOTING') return false;
    lobby.votes[voterId] = targetId;
    const allVoted = Object.keys(lobby.votes).length === lobby.alivePlayers.length;
    return { success: true, allVoted };
  }

  getVotingResults(chatId) {
    const lobby = this.getLobby(chatId);
    const tallies = {};
    for (let targetId of Object.values(lobby.votes)) {
      tallies[targetId] = (tallies[targetId] || 0) + 1;
    }
    let maxVotes = 0, votedOutId = null, tie = false;
    for (let [id, count] of Object.entries(tallies)) {
      if (count > maxVotes) { maxVotes = count; votedOutId = id; tie = false; }
      else if (count === maxVotes) { tie = true; }
    }
    return { votedOutId: tie ? null : parseInt(votedOutId), tallies, tie };
  }

  eliminatePlayer(chatId, playerId) {
    const lobby = this.getLobby(chatId);
    if (!lobby) return null;
    const idx = lobby.alivePlayers.findIndex(p => p.id === playerId);
    if (idx !== -1) {
      const player = lobby.alivePlayers.splice(idx, 1)[0];
      lobby.eliminatedPlayers.push(player);
      return { player, role: lobby.roles[playerId] };
    }
    return null;
  }

  checkWinCondition(chatId) {
    const lobby = this.getLobby(chatId);
    if (!lobby) return null;
    const aliveImpostors = lobby.alivePlayers.filter(p => lobby.roles[p.id] === 'IMPOSTOR');
    const aliveOthers = lobby.alivePlayers.filter(p => lobby.roles[p.id] !== 'IMPOSTOR');
    if (aliveImpostors.length === 0) return 'CIVILIAN_WIN';
    if (aliveImpostors.length >= aliveOthers.length) return 'IMPOSTOR_WIN';
    return null;
  }
}

module.exports = new MafiaManager();
