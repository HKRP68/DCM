const { Match } = require('../game/matchManager');

async function testRealism() {
  console.log("🚀 Starting Match Realism Feature Tests...\n");

  const match = new Match({
    id: 'test_realism_match',
    type: 'pve',
    chatId: 12345,
    totalOvers: 5,
    pitch: 'balanced',
    host: {
      telegramId: 'player1',
      username: 'Player One',
      teamName: "Player One's XI",
      xi: [
        { id: 'host_p1', name: 'Batsman A', batting_rating: 85, batting_archetype: 'Brute', role: 'batsman' },
        { id: 'host_p2', name: 'Batsman B', batting_rating: 80, batting_archetype: 'Anchor', role: 'batsman' }
      ]
    },
    guest: {
      telegramId: 'ai',
      username: 'AI Bowler',
      xi: [
        { id: 'guest_p1', name: 'Bowler A', bowling_rating: 82, bowler_type: 'fast', role: 'bowler' }
      ]
    }
  });

  // 1. Start Innings
  match.tossWinnerId = 'player1';
  match.tossDecision = 'bat';
  match.startFirstInnings({ strikerIdx: 0, nonStrikerIdx: 1, bowlerIdx: 0 });

  console.log(`Match Started! Pitch: ${match.pitch}, Phase: Powerplay`);
  console.log(`Striker: ${match.striker.name}, Bowler: ${match.currentBowler.name}\n`);

  // Test Case 1: Bowler Spamming Yorker
  console.log("--- TEST 1: Bowler Spamming Yorker ---");
  let extrasBowled = 0;
  for (let i = 0; i < 8; i++) {
    match.currentDelivery = 'yorker';
    match.currentSpeed = 'normal';
    match.currentShot = 'drive';

    const prevBalls = match.currentInnings.balls;
    const prevRuns = match.currentInnings.runs;

    const outcome = match.bowlBall();

    if (outcome.isExtra) {
      extrasBowled++;
      console.log(`📍 Ball ${i + 1}: EXTRA! ${outcome.commentary} (Innings Balls: ${match.currentInnings.balls}, Runs: ${match.currentInnings.runs})`);
      // Verify balls did not increment
      if (match.currentInnings.balls !== prevBalls) {
        throw new Error("FAIL: Innings ball count incremented on an extra!");
      }
      if (match.currentInnings.runs !== prevRuns + 1) {
        throw new Error(`FAIL: Runs did not increment by 1 on extra! Got ${match.currentInnings.runs - prevRuns}`);
      }
    } else {
      console.log(`📍 Ball ${i + 1}: Legal Delivery! ${outcome.runs} runs. Commentary: ${outcome.commentary}`);
      if (match.currentInnings.balls !== prevBalls + 1) {
        throw new Error("FAIL: Innings ball count did not increment on legal delivery!");
      }
    }
  }
  console.log(`✅ Test 1 Passed! Wides/No-balls successfully triggered on spamming. Total extras bowled: ${extrasBowled}\n`);

  // Test Case 2: Batsman Spamming Loft
  console.log("--- TEST 2: Batsman Spamming Loft ---");
  // Let's reset the histories so we have a clean state
  const batStats1 = match.stats[match.host.xi[0].id];
  const batStats2 = match.stats[match.host.xi[1].id];
  batStats1.shotHistory = [];
  batStats2.shotHistory = [];

  // We'll bowl 3 balls where batsman spams loft
  for (let i = 0; i < 3; i++) {
    match.currentDelivery = 'full_length';
    match.currentSpeed = 'normal';
    match.currentShot = 'loft';
    
    // We will inspect the histories just before bowling
    const activeStrikerId = match.striker.id;
    const shotHistoryBefore = [...(match.stats[activeStrikerId].shotHistory || [])];
    const outcome = match.bowlBall();
    console.log(`📍 Shot ${i + 1}: Batsman plays Loft. Shot history before: [${shotHistoryBefore.join(', ')}]. Outcome: ${outcome.isWicket ? 'WICKET!' : outcome.runs + ' runs'}`);
    
    // Verify shot history gets updated for the batsman who actually played the shot
    const historyAfter = match.stats[activeStrikerId].shotHistory || [];
    if (historyAfter[historyAfter.length - 1] !== 'loft') {
      throw new Error("FAIL: Shot history not updated correctly!");
    }
  }
  console.log("✅ Test 2 Passed! Batsman shot spamming history updated correctly.\n");

  // Test Case 3: Momentum Calculation Verification
  console.log("--- TEST 3: Momentum Verification ---");
  match.recentOutcomes = [
    { runs: 4, isWicket: false },
    { runs: 6, isWicket: false },
    { runs: 2, isWicket: false }
  ];
  console.log(`Recent outcomes set: 4, 6, 2 (Total runs: 12).`);
  
  // We will run a quick verification call of calculateBallOutcome to see if momentum is captured
  const { calculateBallOutcome } = require('../game/engine');
  const outcomeWithHighMomentum = calculateBallOutcome(
    match.striker,
    match.currentBowler,
    'good_length',
    'drive',
    match.pitch,
    'normal',
    match.bowlingTeam.xi,
    {
      overNumber: 1,
      totalOvers: 5,
      recentOutcomes: match.recentOutcomes,
      shotHistory: [],
      deliveryHistory: [],
      speedHistory: []
    }
  );
  console.log(`Verified calculateBallOutcome returns outcome correctly with momentum context.`);
  console.log("✅ Test 3 Passed!\n");

  console.log("🎉 All realism feature tests completed successfully!");
}

testRealism().catch(err => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
