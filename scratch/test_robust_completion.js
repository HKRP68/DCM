const fs = require('fs');
const path = require('path');
const { generateScoreboardImage } = require('../game/scoreboardGenerator');

// Set up environment variable bypasses so we don't crash on missing config
process.env.SUPABASE_URL = "";
process.env.SUPABASE_KEY = "";

// Helper for testing
async function testScenario(name, mockMatch, mockResult, marginText) {
  console.log(`\n----------------------------------------`);
  console.log(`Running Scenario: ${name}`);
  try {
    const buffer = await generateScoreboardImage(mockMatch, mockResult, marginText);
    if (buffer) {
      console.log(`✅ Success: Scoreboard image generated successfully. Buffer size: ${buffer.length} bytes`);
    } else {
      console.log(`⚠️ Note: Scoreboard image returned null (handled fallback).`);
    }
  } catch (err) {
    console.error(`❌ CRITICAL FAILURE: Threw an exception:`, err);
    process.exit(1);
  }
}

// Mock helper to run the exact code block from bot.js and make sure it does not crash
async function testBotJsLogicBlock(mockMatch, mockResult) {
  console.log(`\nTesting bot.js match resolution block logic...`);
  
  // Mock globals and functions used in bot.js
  const escapeHTML = (text) => {
    if (!text) return "";
    return text.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  const getMatchPlayUrl = (m) => `http://example.com/match/${m.id}`;
  const sendTelegramMessage = async (m, txt) => {
    console.log(`[Mock Send Message] ChatId: ${m.chatId}. Text: ${txt.substring(0, 80)}...`);
  };
  const botInfo = { username: 'ImposterTest_bot' };
  const bot = {
    api: {
      sendPhoto: async (chatId, photo, options) => {
        console.log(`[Mock sendPhoto] ChatId: ${chatId}. Photo size: ${photo.source?.length || 'unknown'}`);
      }
    }
  };
  
  // InputFile mock
  class InputFile {
    constructor(source, filename) {
      this.source = source;
      this.filename = filename;
    }
  }

  // --- BEGIN REPLICATED BOT.JS LOGIC BLOCK ---
  try {
    // result is already obtained
    const result = mockResult;
    
    const mockCommentary = [];
    mockCommentary.unshift({
      type: 'end_of_innings',
      inningsIdx: 1,
      runs: result?.inn2Runs || 0,
      wickets: result?.inn2Wickets || 0,
      overs: result?.inn2Overs || '0.0',
      winner: result?.winner ? result.winner.username : 'Tie Match',
      motm: result?.motm || null
    });

    let marginText = '';
    if (result && result.winner) {
      const inn1 = mockMatch.innings[0];
      const inn2 = mockMatch.innings[1];
      const winnerId = result.winner.telegramId ? result.winner.telegramId.toString() : '';
      const inn2BattingId = inn2?.battingId ? inn2.battingId.toString() : '';
      const isWinnerInn2 = winnerId && winnerId === inn2BattingId;
      
      if (isWinnerInn2) {
        const wicketsWonBy = 10 - (inn2?.wickets || 0);
        marginText = `won by ${wicketsWonBy} wicket${wicketsWonBy > 1 ? 's' : ''}`;
      } else {
        const runsWonBy = (inn1?.runs || 0) - (inn2?.runs || 0);
        marginText = `won by ${runsWonBy} run${runsWonBy > 1 ? 's' : ''}`;
      }
    }

    let summary;
    if (result && result.winner) {
      summary = `🏆 <b>MATCH COMPLETED!</b>\n\n🎉 <b>${escapeHTML(result.winner.username)}</b> ${marginText}!`;
    } else {
      summary = `🏆 <b>MATCH COMPLETED!</b>\n\n🤝 <b>Match Tied!</b>`;
    }

    const botUsername = botInfo?.username || 'Imposter0_bot';
    const playUrl = getMatchPlayUrl(mockMatch);
    const isPrivate = mockMatch.chatId > 0;
    
    let buttonObj;
    if (isPrivate) {
      buttonObj = { text: "↗️ View Match Details", web_app: { url: playUrl } };
    } else {
      const directLink = `https://t.me/${botUsername}/bonus?startapp=cricket_${mockMatch.id}_${mockMatch.chatId}`;
      buttonObj = { text: "↗️ View Match Details", url: directLink };
    }

    const reply_markup = {
      inline_keyboard: [
        [buttonObj]
      ]
    };

    try {
      const photoBuffer = await generateScoreboardImage(mockMatch, result, marginText);
      if (photoBuffer) {
        await bot.api.sendPhoto(mockMatch.chatId, new InputFile(photoBuffer, 'scoreboard.png'), {
          caption: summary,
          reply_markup,
          parse_mode: 'HTML'
        });
      } else {
        await sendTelegramMessage(mockMatch, summary, { reply_markup });
      }
    } catch (err) {
      console.error("Failed to send scoreboard photo, falling back to text:", err);
      await sendTelegramMessage(mockMatch, summary, { reply_markup });
    }
  } catch (finalizeErr) {
    console.error("Error during match completion/finalization:", finalizeErr);
    throw finalizeErr; // fail the test if the outer block throws
  }
  // --- END REPLICATED BOT.JS LOGIC BLOCK ---
  console.log(`✅ Success: bot.js match resolution logic block completed without crashing.`);
}

async function runTests() {
  console.log("🚀 Starting scoreboard null-safety tests...");

  // 1. Base Valid Case
  const validMatch = {
    host: {
      telegramId: '12345678',
      username: 'host_user',
      teamName: 'INDIA',
      xi: [{ id: 'h1', name: 'Virat Kohli' }, { id: 'h2', name: 'KL Rahul' }]
    },
    guest: {
      telegramId: '87654321',
      username: 'guest_user',
      teamName: 'SOUTH AFRICA',
      xi: [{ id: 'g1', name: 'Marco Jansen' }]
    },
    innings: [
      { battingId: '12345678', bowlingId: '87654321' },
      { battingId: '87654321', bowlingId: '12345678' }
    ],
    stats: {
      'h1': { runs: 50, balls: 30 },
      'g1': { wickets: 2, runsConceded: 20, overs: 2 }
    }
  };
  const validResult = {
    winner: { telegramId: '12345678', username: 'host_user', teamName: 'INDIA' },
    inn1Runs: 150, inn1Wickets: 2, inn1Overs: '5.0',
    inn2Runs: 140, inn2Wickets: 3, inn2Overs: '5.0',
    motm: { name: 'Virat Kohli', runs: 50, balls: 30, wickets: 0, overs: 0 }
  };

  await testScenario("Valid Match Case", validMatch, validResult, "won by 10 runs");
  await testBotJsLogicBlock(validMatch, validResult);

  // 2. Edge Case: Missing Guest (null guest)
  const noGuestMatch = {
    host: {
      telegramId: '12345678',
      username: 'host_user',
      teamName: 'INDIA',
      xi: [{ id: 'h1', name: 'Virat Kohli' }]
    },
    guest: null,
    innings: [
      { battingId: '12345678', bowlingId: 'ai' },
      { battingId: 'ai', bowlingId: '12345678' }
    ],
    stats: {
      'h1': { runs: 50, balls: 30 }
    }
  };
  const noGuestResult = {
    winner: { telegramId: 'ai', username: 'AI Bot', teamName: 'AI XI' },
    inn1Runs: 150, inn1Wickets: 2, inn1Overs: '5.0',
    inn2Runs: 151, inn2Wickets: 1, inn2Overs: '4.5',
    motm: null
  };

  await testScenario("Null Guest Case", noGuestMatch, noGuestResult, "won by 9 wickets");
  await testBotJsLogicBlock(noGuestMatch, noGuestResult);

  // 3. Edge Case: Missing Innings IDs (null/undefined battingId & bowlingId)
  const noInningsIdsMatch = {
    host: {
      telegramId: '12345678',
      username: 'host_user',
      teamName: 'INDIA',
      xi: [{ id: 'h1', name: 'Virat Kohli' }]
    },
    guest: {
      telegramId: '87654321',
      username: 'guest_user',
      xi: [{ id: 'g1', name: 'Marco Jansen' }]
    },
    innings: [
      { battingId: null, bowlingId: undefined },
      { battingId: undefined, bowlingId: null }
    ],
    stats: {}
  };
  const noInningsIdsResult = {
    winner: null,
    inn1Runs: 100, inn1Wickets: 5, inn1Overs: '5.0',
    inn2Runs: 100, inn2Wickets: 5, inn2Overs: '5.0',
    motm: null
  };

  await testScenario("Null/Undefined Innings IDs Case", noInningsIdsMatch, noInningsIdsResult, "");
  await testBotJsLogicBlock(noInningsIdsMatch, noInningsIdsResult);

  // 4. Edge Case: Missing Host and Guest completely
  const missingPlayersMatch = {
    host: {},
    guest: {},
    innings: [
      { battingId: '12345678', bowlingId: '87654321' }
    ],
    stats: {}
  };
  const missingPlayersResult = {
    winner: null,
    inn1Runs: 0, inn1Wickets: 0, inn1Overs: '0.0',
    inn2Runs: 0, inn2Wickets: 0, inn2Overs: '0.0',
    motm: null
  };

  await testScenario("Missing Host/Guest Properties Case", missingPlayersMatch, missingPlayersResult, "");
  await testBotJsLogicBlock(missingPlayersMatch, missingPlayersResult);

  console.log("\n🎉 ALL SAFETY AND NULL-POINTER PREVENTION TESTS PASSED!");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
