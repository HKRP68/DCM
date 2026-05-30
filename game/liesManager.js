const fs = require('fs');
const path = require('path');

const quizPath = path.join(__dirname, '../data/quiz.json');
const quizData = JSON.parse(fs.readFileSync(quizPath, 'utf8'));

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

class LiesManager {
  createLobby(chatId, host, challenger = null, rounds = 5, category = 'Cricket') {
    const lobby = {
      chatId,
      players: [host],
      challengerId: challenger?.id || null, // If null, anyone can join
      isDirect: !!challenger,
      scores: { [host.id]: 0 },
      state: 'LOBBY',
      round: 0,
      totalRounds: rounds,
      category,
      currentQuestion: null,
      submissions: {}, // userId -> { type, value }
      askedQuestions: [], // Track indices to avoid repetition
      createdAt: Date.now(),
      timer: null
    };
    addUserLobby(host.id, chatId);
    if (challenger) {
        lobby.players.push(challenger);
        lobby.scores[challenger.id] = 0;
        addUserLobby(challenger.id, chatId);
    }
    lobbies.set(chatId, lobby);
    return lobby;
  }

  getLobby(chatId) { return lobbies.get(chatId); }
  getLobbies() { return lobbies; }
  hasLobby(chatId) { return lobbies.has(chatId); }
  getLobbyByUserId(userId) {
    const chatIds = userLobbies.get(userId);
    if (!chatIds) return null;
    for (const chatId of chatIds) {
        const lobby = lobbies.get(chatId);
        if (lobby && lobby.players.find(p => p.id === userId)) return lobby;
    }
    return null;
  }
  deleteLobby(chatId) {
    const lobby = lobbies.get(chatId);
    if (lobby) { lobby.players.forEach(p => removeUserLobby(p.id, chatId)); }
    lobbies.delete(chatId);
  }
  getActiveGamesCount() { return lobbies.size; }

  getCategories() {
      return Object.keys(quizData.categories);
  }

  joinLobby(chatId, user) {
    const lobby = lobbies.get(chatId);
    if (!lobby || lobby.state !== 'LOBBY') return false;
    if (lobby.players.length >= 2) return false;
    if (lobby.isDirect && user.id !== lobby.challengerId) return false;
    
    lobby.players.push(user);
    lobby.scores[user.id] = 0;
    addUserLobby(user.id, chatId);
    return true;
  }

  nextRound(chatId) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return null;
    
    lobby.round++;
    if (lobby.round > lobby.totalRounds) {
        lobby.state = 'END';
        return { type: 'END' };
    }

    lobby.state = 'QUIZ_PHASE';
    lobby.submissions = {};
    
    const questions = quizData.categories[lobby.category] || [];

    // Pick random question that hasn't been asked
    const availableIndices = questions
        .map((_, i) => i)
        .filter(i => !lobby.askedQuestions.includes(i));
    
    if (availableIndices.length === 0) {
        lobby.state = 'END';
        return { type: 'END' };
    }

    const qIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    lobby.askedQuestions.push(qIndex);
    lobby.currentQuestion = questions[qIndex];
    
    return { type: 'ROUND', round: lobby.round, question: lobby.currentQuestion.q };
  }

  submitChoice(userId, type, value = "") {
    const lobby = this.getLobbyByUserId(userId);
    if (!lobby || lobby.state !== 'QUIZ_PHASE') return { error: "No active quiz phase." };
    if (lobby.submissions[userId]) return { error: "Already submitted." };

    lobby.submissions[userId] = { type, value: value.toLowerCase().trim() };
    const allDone = Object.keys(lobby.submissions).length === 2;
    return { success: true, allDone };
  }

  checkAnswer(input, questionObj) {
    if (!input) return false;
    const cleanInput = input.toLowerCase().trim();
    const inputNoSpace = cleanInput.replace(/[\s,.-]+/g, '');
    const inputWords = cleanInput.split(/[\s,.-]+/);
    const variants = questionObj.v.map(v => v.toLowerCase().trim());
    
    // 1. Exact match, spaceless match, and acronym match
    for (const v of variants) {
        if (v === cleanInput) return true;
        
        const vNoSpace = v.replace(/[\s,.-]+/g, '');
        if (vNoSpace === inputNoSpace) return true;
        
        const vWords = v.split(/[\s-]+/);
        if (vWords.length > 1) {
            const acronym = vWords.map(w => w[0]).join('');
            if (acronym === cleanInput && acronym.length >= 2) return true;
        }
    }
    
    // 2. Phrase matching (if variant appears standalone in input)
    for (const v of variants) {
        const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:^|\\W)${escaped}(?:\\W|$)`);
        if (regex.test(cleanInput)) return true;
    }

    // 3. Significant partial match (e.g. first or last names exclusively)
    for (const v of variants) {
        const vWords = v.split(/[\s-]+/).filter(w => w.length >= 4);
        for (const vw of vWords) {
            if (inputWords.includes(vw)) {
                return true;
            }
        }
    }
    
    return false;
  }

  calculateResults(chatId) {
    const lobby = lobbies.get(chatId);
    if (!lobby) return null;

    const p1 = lobby.players[0];
    const p2 = lobby.players[1];
    const s1 = lobby.submissions[p1.id];
    const s2 = lobby.submissions[p2.id];
    const q = lobby.currentQuestion;

    const res = {
      [p1.id]: { points: 0, correct: false, action: s1.type, value: s1.value },
      [p2.id]: { points: 0, correct: false, action: s2.type, value: s2.value }
    };

    const is1Correct = s1.type === 'answer' && this.checkAnswer(s1.value, q);
    const is2Correct = s2.type === 'answer' && this.checkAnswer(s2.value, q);
    res[p1.id].correct = is1Correct;
    res[p2.id].correct = is2Correct;

    // SCORING LOGIC
    if (s1.type === 'answer' && s2.type === 'answer') {
        if (is1Correct && is2Correct) { res[p1.id].points = 1; res[p2.id].points = 1; }
        else if (is1Correct) { res[p1.id].points = 1; }
        else if (is2Correct) { res[p2.id].points = 1; }
    } 
    else if (s1.type === 'steal' && s2.type === 'steal') {
        res[p1.id].points = -2; res[p2.id].points = -2;
    }
    else if (s1.type === 'steal') {
        if (is2Correct) { res[p1.id].points = 2; res[p2.id].points = 0; }
        else { res[p1.id].points = -2; }
    }
    else if (s2.type === 'steal') {
        if (is1Correct) { res[p2.id].points = 2; res[p1.id].points = 0; }
        else { res[p2.id].points = -2; }
    }

    lobby.scores[p1.id] += res[p1.id].points;
    lobby.scores[p2.id] += res[p2.id].points;

    return { results: res, scores: lobby.scores, question: q.a };
  }
}

module.exports = new LiesManager();
