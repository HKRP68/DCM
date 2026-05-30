const fs = require('fs');
const path = require('path');
const { InlineKeyboard } = require('grammy');

// In-memory lobby storage 
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

class GameManager {
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
      if (lobby && lobby.players.find(p => p.id === userId)) {
        if (lobby.state === 'CLUE_PHASE') return lobby;
        fallback = lobby;
      }
    }
    return fallback;
  }

  getPlayerData(userId) {
    const lobby = this.getLobbyByUserId(userId);
    if (!lobby || lobby.state === 'LOBBY') return null;
    const isImpostor = userId === lobby.impostorId;
    return {
        mode: 'standard',
        word: isImpostor ? lobby.wordB : lobby.wordA,
        theme: lobby.themeName,
        isImpostor,
        maxWords: lobby.maxClueWords
    };
  }


  createLobby(chatId, hostUser) {
    lobbies.set(chatId, {
      chatId,
      host: hostUser,
      players: [hostUser],
      state: 'LOBBY',
      theme: null,
      wordA: null,
      wordB: null,
      impostorId: null,
      cluesReceived: {},
      votes: {},
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
    if (idx !== -1) {
      lobby.players.splice(idx, 1);
      removeUserLobby(userId, chatId);
      return true;
    }
    return false;
  }

  deleteLobby(chatId) {
    const lobby = lobbies.get(chatId);
    if (lobby) {
      lobby.players.forEach(p => removeUserLobby(p.id, chatId));
    }
    lobbies.delete(chatId);
  }

  moveToThemeSelection(chatId) {
    const lobby = lobbies.get(chatId);
    if (lobby) lobby.state = 'THEME_SELECTION';
  }

  getAvailableThemes() {
    return Object.keys(themesData.themes);
  }

  async startGame(chatId, themeName, botInstance, gSettings = {}) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return;
    
    lobby.state = 'CLUE_PHASE';
    lobby.theme = themeName;
    lobby.maxClueWords = gSettings.clue_words || 1;
    
    const themeClusters = themesData.themes[themeName];
    const cluster = themeClusters[Math.floor(Math.random() * themeClusters.length)];
    
    let idxA = Math.floor(Math.random() * cluster.length);
    let idxB = Math.floor(Math.random() * cluster.length);
    while (idxB === idxA) {
       idxB = Math.floor(Math.random() * cluster.length);
    }
    
    const isASwapped = Math.random() > 0.5;
    lobby.wordA = isASwapped ? cluster[idxA] : cluster[idxB];
    lobby.wordB = isASwapped ? cluster[idxB] : cluster[idxA];
    
    const impostorIndex = Math.floor(Math.random() * lobby.players.length);
    lobby.impostorId = lobby.players[impostorIndex].id;
    
    const me = botInstance.botInfo || await botInstance.api.getMe();
    const dmKeyboard = new InlineKeyboard().url("📩 Go to Bot DM", `https://t.me/${me.username}`);
    
    const clueLabel = lobby.maxClueWords === 1 ? 'EXACTLY ONE word' : `up to ${lobby.maxClueWords} words`;
    await botInstance.api.sendMessage(chatId, 
      `The game has started! Theme: <b>${themeName}</b>.\n\nPlease check your DMs from the bot. I will send you your secret word. Reply to my DM with ${clueLabel} as your clue!`, 
      { parse_mode: 'HTML', reply_markup: dmKeyboard }
    );
    
    for (let player of lobby.players) {
      const isImpostor = player.id === lobby.impostorId;
      const secretWord = isImpostor ? lobby.wordB : lobby.wordA;
      const wordInstr = lobby.maxClueWords === 1 ? 'exactly <b>ONE WORD</b>' : `<b>up to ${lobby.maxClueWords} words</b>`;
      
      try {
         await botInstance.api.sendMessage(
           player.id, 
           `🕵️‍♂️ <b>Undercover Game</b>\n\nTheme: <b>${themeName}</b>\nYour Secret Word: <tg-spoiler>${secretWord}</tg-spoiler>\n\n<b>INSTRUCTIONS:</b>\n1. This word is your identity.\n2. Reply to this message with ${wordInstr} to describe your secret word.\n3. Do not make your clue too obvious, or the Impostor will guess it and win!`, 
           { parse_mode: 'HTML' }
         );
      } catch (err) {
         await botInstance.api.sendMessage(
           chatId, 
           `⚠️ Could not DM <a href="tg://user?id=${player.id}">${player.first_name}</a>. Please make sure you have started a private chat with me first! Cancelling game...`, 
           { parse_mode: "HTML" }
         );
         this.deleteLobby(chatId);
         return;
      }
    }
  }

  submitClue(userId, word) {
    const lobby = this.getLobbyByUserId(userId);
    if (!lobby) return { error: "You are not in any active game right now." };
    if (lobby.state !== 'CLUE_PHASE') return { error: "It's not time to submit clues right now." };
    if (lobby.cluesReceived[userId]) return { error: "You already submitted your clue!" };
    
    const maxWords = lobby.maxClueWords || 1;
    const wordCount = word.trim().split(/\s+/).length;
    if (wordCount > maxWords) {
      if (maxWords === 1) return { error: "Please send EXACTLY ONE word! Try again." };
      return { error: `Please send up to ${maxWords} words only! You sent ${wordCount}. Try again.` };
    }
    
    lobby.cluesReceived[userId] = word.trim();
    
    const allReceived = Object.keys(lobby.cluesReceived).length === lobby.players.length;
    if (allReceived) {
      lobby.state = 'DISCUSSION';
    }
    
    return { success: true, allReceived, lobby };
  }

  vote(chatId, voterId, targetId) {
    const lobby = this.getLobby(chatId);
    if (!lobby || lobby.state !== 'VOTING') return false;
    
    lobby.votes[voterId] = targetId;
    
    const allVoted = Object.keys(lobby.votes).length === lobby.players.length;
    return { success: true, allVoted };
  }

  getVotingResults(chatId) {
    const lobby = this.getLobby(chatId);
    const tallies = {};
    for (let targetId of Object.values(lobby.votes)) {
      tallies[targetId] = (tallies[targetId] || 0) + 1;
    }
    
    let maxVotes = 0;
    let votedOutId = null;
    let tie = false;
    
    for (let [id, count] of Object.entries(tallies)) {
      if (count > maxVotes) {
        maxVotes = count;
        votedOutId = id;
        tie = false;
      } else if (count === maxVotes) {
        tie = true;
      }
    }
    
    return { votedOutId: tie ? null : parseInt(votedOutId), tallies, tie };
  }

  eliminatePlayer(chatId, userId) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return null;
    const idx = lobby.players.findIndex(p => p.id === userId);
    if (idx !== -1) {
      const player = lobby.players.splice(idx, 1)[0];
      removeUserLobby(userId, chatId);
      return player;
    }
    return null;
  }

  checkWinCondition(chatId) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return null;
    // Standard mode: If impostor is eliminated, majority wins. 
    // If only 2 players left and one is impostor, impostor wins.
    const isImpostorAlive = lobby.players.some(p => p.id === lobby.impostorId);
    if (!isImpostorAlive) return 'MAJORITY_WIN';
    if (lobby.players.length <= 2 && isImpostorAlive) return 'IMPOSTOR_WIN';
    return null;
  }
}

module.exports = new GameManager();
