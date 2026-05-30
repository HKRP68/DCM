const fs = require('fs');
const path = require('path');
const { normalizeWord } = require('../utils');

const wordsPath = path.join(__dirname, '../data/guessWords.json');
const wordsData = JSON.parse(fs.readFileSync(wordsPath, 'utf8')).words;

// chatId -> { host, currentWord, isGuessingEnabled, lastWinnerId, winnerPriorityTimer }
const activeGames = new Map();

function createGame(chatId, host) {
    const game = {
        chatId,
        host: host, // { id, first_name }
        currentWord: getRandomWord(),
        isGuessingEnabled: true,
        priorityActive: false,
        lastWinnerId: null,
        winnerPriorityTimer: null,
        startTime: Date.now()
    };
    activeGames.set(chatId, game);
    return game;
}

function getRandomWord() {
    return wordsData[Math.floor(Math.random() * wordsData.length)];
}

function getGame(chatId) {
    return activeGames.get(chatId);
}

function nextWord(chatId) {
    const game = activeGames.get(chatId);
    if (!game) return null;
    game.currentWord = getRandomWord();
    return game.currentWord;
}

function endGame(chatId) {
    const game = activeGames.get(chatId);
    if (game && game.winnerPriorityTimer) clearTimeout(game.winnerPriorityTimer);
    activeGames.delete(chatId);
}

function checkGuess(chatId, guess) {
    const game = activeGames.get(chatId);
    if (!game || !game.isGuessingEnabled) return false;
    
    const normalizedGuess = normalizeWord(guess);
    const normalizedWord = normalizeWord(game.currentWord);
    
    // Exact match or very close match
    return normalizedGuess === normalizedWord;
}

function getAllGames() {
    return activeGames;
}

module.exports = {
    createGame,
    getGame,
    getAllGames,
    nextWord,
    endGame,
    checkGuess,
    getRandomWord
};
