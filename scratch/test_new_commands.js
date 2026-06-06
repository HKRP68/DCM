require('dotenv').config();
const sb = require('../db/supabase.js');

async function test() {
  console.log("=== Testing Undercover Bot New Database Methods ===");

  if (!sb.supabase) {
    console.error("Database connection is not initialized.");
    return;
  }

  // 1. Fetching all completed matches globally
  console.log("\n1. Testing getAllCompletedMatches...");
  const allMatches = await sb.getAllCompletedMatches();
  console.log(`Found ${allMatches.length} completed matches globally.`);

  // 2. Fetching user-specific completed matches
  const targetUserId = 8668559460; // From previous test logs
  console.log(`\n2. Testing getAllUserCompletedMatches for userId: ${targetUserId}...`);
  const userMatches = await sb.getAllUserCompletedMatches(targetUserId);
  console.log(`Found ${userMatches.length} completed matches for user ${targetUserId}.`);

  // 3. Test resolveCricketPlayer logic simulation
  console.log("\n3. Simulating player resolution...");
  const players = await sb.getCricketPlayers();
  if (players && players.length > 0) {
    const query = "Konstas";
    const matched = players.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    console.log(`Searching for "${query}"...`);
    matched.forEach(p => console.log(`- Matched: ${p.name} (ID: ${p.id}, OVR: ${p.ovr})`));
    
    // Exact match test
    const exactQuery = "Sam Konstas";
    const exactMatched = players.find(p => p.name.toLowerCase() === exactQuery.toLowerCase());
    console.log(`Searching exact match for "${exactQuery}"...`);
    console.log(`- Matched: ${exactMatched ? exactMatched.name : "None"}`);
  }

  // 4. Test stats aggregation simulation for "/ps"
  console.log("\n4. Simulating stats aggregation logic...");
  if (players && players.length > 0 && userMatches.length > 0) {
    const player = players.find(p => p.name === "Sam Konstas");
    if (player) {
      console.log(`Aggregating stats for ${player.name} in user matches...`);
      let matchesPlayed = 0;
      let runs = 0;
      let balls = 0;
      let fours = 0;
      let sixes = 0;
      let dismissals = 0;
      let highestScore = { runs: 0, isOut: true };
      
      let runsConceded = 0;
      let wickets = 0;
      let ballsBowled = 0;
      let bestBowling = { wickets: 0, runsConceded: Infinity };

      const cleanPlayerId = (pid) => pid.replace(/^(host_|guest_)+/, '');

      userMatches.forEach(match => {
        const state = match.state_json;
        if (!state) return;

        const isHost = match.host_id.toString() === targetUserId.toString();
        const isGuest = match.guest_id && match.guest_id.toString() === targetUserId.toString();

        let foundInXI = null;
        if (isHost && state.host && state.host.xi) {
          foundInXI = state.host.xi.find(p => cleanPlayerId(p.id) === player.id || p.name.toLowerCase() === player.name.toLowerCase());
        } else if (isGuest && state.guest && state.guest.xi) {
          foundInXI = state.guest.xi.find(p => cleanPlayerId(p.id) === player.id || p.name.toLowerCase() === player.name.toLowerCase());
        }

        if (foundInXI) {
          matchesPlayed++;
          const pStats = state.stats && state.stats[foundInXI.id];
          if (pStats) {
            const currentRuns = pStats.runs || 0;
            const currentBalls = pStats.balls || 0;
            const currentFours = pStats.fours || 0;
            const currentSixes = pStats.sixes || 0;
            const isOut = !!pStats.isOut;

            runs += currentRuns;
            balls += currentBalls;
            fours += currentFours;
            sixes += currentSixes;
            if (isOut) dismissals++;

            if (currentRuns > highestScore.runs) {
              highestScore = { runs: currentRuns, isOut };
            } else if (currentRuns === highestScore.runs && !isOut && highestScore.isOut) {
              highestScore = { runs: currentRuns, isOut };
            }

            const currentWickets = pStats.wickets || 0;
            const currentRunsConceded = pStats.runsConceded || 0;
            const oversVal = pStats.overs || 0;
            const oversInt = Math.floor(oversVal);
            const ballsFraction = Math.round((oversVal % 1) * 10);
            const matchBallsBowled = (oversInt * 6) + ballsFraction;

            runsConceded += currentRunsConceded;
            wickets += currentWickets;
            ballsBowled += matchBallsBowled;

            if (matchBallsBowled > 0 || currentRunsConceded > 0 || currentWickets > 0) {
              if (currentWickets > bestBowling.wickets) {
                bestBowling = { wickets: currentWickets, runsConceded: currentRunsConceded };
              } else if (currentWickets === bestBowling.wickets && currentRunsConceded < bestBowling.runsConceded) {
                bestBowling = { wickets: currentWickets, runsConceded: currentRunsConceded };
              }
            }
          }
        }
      });

      console.log(`Stats for ${player.name} in user matches:`);
      console.log(`- Matches Played: ${matchesPlayed}`);
      console.log(`- Batting: Runs=${runs}, Balls faced=${balls}, Dismissals=${dismissals}, SR=${balls > 0 ? ((runs / balls) * 100).toFixed(2) : '0.00'}, Avg=${dismissals > 0 ? (runs / dismissals).toFixed(2) : '0.00'}`);
      console.log(`- Bowling: Overs=${Math.floor(ballsBowled/6)}.${ballsBowled%6}, Wickets=${wickets}, Runs Conceded=${runsConceded}, Econ=${ballsBowled > 0 ? ((runsConceded / ballsBowled) * 6).toFixed(2) : '0.00'}`);
    }
  }

  // 5. Test award / remove player admins simulation
  console.log("\n5. Testing admin award/remove player methods...");
  const testPlayer = players[0];
  console.log(`Using test player: ${testPlayer.name} (ID: ${testPlayer.id})`);
  
  // Award player
  console.log("Awarding player to user...");
  const awardRes = await sb.awardPlayer(targetUserId, testPlayer.id, 'cricket');
  console.log("Award result:", awardRes);

  // Remove player
  console.log("Removing player from user...");
  const removeRes = await sb.removePlayerFromSquad(targetUserId, testPlayer.id, 'cricket');
  console.log("Remove result:", removeRes);
}

test();
