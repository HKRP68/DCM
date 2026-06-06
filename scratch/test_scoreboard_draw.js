const fs = require('fs');
const path = require('path');
const { generateScoreboardImage } = require('../game/scoreboardGenerator');

const mockMatch = {
  host: {
    telegramId: '12345678',
    username: 'aswathvanmol',
    teamName: 'INDIA',
    xi: [
      { id: 'h1', name: 'Virat Kohli' },
      { id: 'h2', name: 'Shreyas Iyer' },
      { id: 'h3', name: 'Axar Patel' },
      { id: 'h4', name: 'KL Rahul' },
      { id: 'h5', name: 'Jasprit Bumrah' },
      { id: 'h6', name: 'Mohd. Shami' },
      { id: 'h7', name: 'Harshit Rana' },
      { id: 'h8', name: 'Ravindra Jadeja' }
    ]
  },
  guest: {
    telegramId: '87654321',
    username: 'imposter_guest',
    teamName: 'SOUTH AFRICA',
    xi: [
      { id: 'g1', name: 'Marco Jansen' },
      { id: 'g2', name: 'Heinrich Klaasen' },
      { id: 'g3', name: 'David Miller' },
      { id: 'g4', name: 'Aiden Markram' },
      { id: 'g5', name: 'Dale Steyn' },
      { id: 'g6', name: 'Lockie Ferguson' },
      { id: 'g7', name: 'Michael Bracewell' },
      { id: 'g8', name: 'Tom Latham' }
    ]
  },
  innings: [
    { battingId: '12345678', bowlingId: '87654321' },
    { battingId: '87654321', bowlingId: '12345678' }
  ],
  stats: {
    // Innings 1 Batsmen (India)
    'h1': { runs: 20, balls: 25 },
    'h2': { runs: 50, balls: 40 },
    'h3': { runs: 40, balls: 33 },
    'h4': { runs: 30, balls: 22 },
    // Innings 1 Bowlers (South Africa)
    'g5': { wickets: 2, runsConceded: 40, overs: 4.0 },
    'g6': { wickets: 1, runsConceded: 50, overs: 4.0 },
    'g7': { wickets: 0, runsConceded: 20, overs: 4.0 },
    'g8': { wickets: 0, runsConceded: 30, overs: 4.0 },

    // Innings 2 Batsmen (South Africa)
    'g1': { runs: 50, balls: 36 },
    'g2': { runs: 50, balls: 54 },
    'g3': { runs: 36, balls: 20 },
    'g4': { runs: 5, balls: 4 },
    // Innings 2 Bowlers (India)
    'h5': { wickets: 1, runsConceded: 44, overs: 4.0 },
    'h6': { wickets: 0, runsConceded: 47, overs: 4.0 },
    'h7': { wickets: 0, runsConceded: 30, overs: 4.0 },
    'h8': { wickets: 0, runsConceded: 20, overs: 3.0 }
  }
};

const mockResult = {
  winner: {
    username: 'imposter_guest',
    teamName: 'SOUTH AFRICA'
  },
  inn1Runs: 140,
  inn1Wickets: 3,
  inn1Overs: '20.0',
  inn2Runs: 141,
  inn2Wickets: 1,
  inn2Overs: '19.0'
};

const marginText = 'won by 9 wickets';

async function run() {
  const buf = await generateScoreboardImage(mockMatch, mockResult, marginText);
  if (buf) {
    fs.writeFileSync(path.join(__dirname, 'test_scoreboard_out.png'), buf);
    console.log('Success! Saved TV scoreboard to scratch/test_scoreboard_out.png');
  } else {
    console.error('Failed to generate TV scoreboard image!');
  }
}

run();
