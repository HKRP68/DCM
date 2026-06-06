const assert = require('assert');

// The role order we defined: batsman (1), wicket_keeper (2), all_rounder (3), bowler (4)
const ROLE_ORDER = { 'batsman': 1, 'wicket_keeper': 2, 'all_rounder': 3, 'bowler': 4 };

// Mimics the dynamic sort in getUserCricketTeam
function sortPlayingXI(result) {
  if (result.length >= 11) {
    const xi = result.slice(0, 11);
    const bench = result.slice(11);
    xi.sort((a, b) => {
      const orderA = ROLE_ORDER[a.role] || 5;
      const orderB = ROLE_ORDER[b.role] || 5;
      if (orderA !== orderB) return orderA - orderB;
      return (b.ovr || 0) - (a.ovr || 0);
    });
    return [...xi, ...bench];
  }
  return result;
}

// Mimics the logic in swapSquadOrder
function mockSwapSquadOrder(ownedPlayers, detailsMap, pos1, pos2) {
  if (pos1 < 1 || pos1 > ownedPlayers.length || pos2 < 1 || pos2 > ownedPlayers.length) {
    throw new Error('Invalid swap positions');
  }

  // Clone to avoid side effects
  const owned = ownedPlayers.map(o => ({ ...o }));

  // 1. Swap the players in the array
  const temp = owned[pos1 - 1];
  owned[pos1 - 1] = owned[pos2 - 1];
  owned[pos2 - 1] = temp;

  // 2. Sort the Playing XI (first 11) by role and OVR descending
  const xi = owned.slice(0, 11);
  const bench = owned.slice(11);

  xi.sort((a, b) => {
    const detA = detailsMap[a.player_id] || { role: 'bowler', ovr: 0 };
    const detB = detailsMap[b.player_id] || { role: 'bowler', ovr: 0 };
    const orderA = ROLE_ORDER[detA.role] || 5;
    const orderB = ROLE_ORDER[detB.role] || 5;
    if (orderA !== orderB) return orderA - orderB;
    return (detB.ovr || 0) - (detA.ovr || 0);
  });

  const newOwnedList = [...xi, ...bench];

  // Assign squad_order sequentially
  return newOwnedList.map((item, idx) => ({
    ...item,
    squad_order: idx + 1
  }));
}

// Test cases
function runTests() {
  console.log("=== Running Swap and Sorting Logic Unit Tests ===");

  // Create a mock squad of 15 players
  // Initial database state (ordered by squad_order)
  const initialSquad = [
    { id: 101, player_id: 'P1', name: 'Batsman A', role: 'batsman', ovr: 85, squad_order: 1 },
    { id: 102, player_id: 'P2', name: 'Batsman B', role: 'batsman', ovr: 80, squad_order: 2 },
    { id: 103, player_id: 'P3', name: 'Wicket Keeper A', role: 'wicket_keeper', ovr: 88, squad_order: 3 },
    { id: 104, player_id: 'P4', name: 'All Rounder A', role: 'all_rounder', ovr: 90, squad_order: 4 },
    { id: 105, player_id: 'P5', name: 'Bowler A', role: 'bowler', ovr: 82, squad_order: 5 },
    { id: 106, player_id: 'P6', name: 'Bowler B', role: 'bowler', ovr: 78, squad_order: 6 },
    { id: 107, player_id: 'P7', name: 'Bowler C', role: 'bowler', ovr: 75, squad_order: 7 },
    { id: 108, player_id: 'P8', name: 'Batsman C', role: 'batsman', ovr: 75, squad_order: 8 },
    { id: 109, player_id: 'P9', name: 'Bowler D', role: 'bowler', ovr: 72, squad_order: 9 },
    { id: 110, player_id: 'P10', name: 'Bowler E', role: 'bowler', ovr: 70, squad_order: 10 },
    { id: 111, player_id: 'P11', name: 'Bowler F', role: 'bowler', ovr: 68, squad_order: 11 },
    // Bench players
    { id: 112, player_id: 'P12', name: 'Legend Batsman', role: 'batsman', ovr: 95, squad_order: 12 },
    { id: 113, player_id: 'P13', name: 'Bowler G', role: 'bowler', ovr: 79, squad_order: 13 },
    { id: 114, player_id: 'P14', name: 'Wicket Keeper B', role: 'wicket_keeper', ovr: 83, squad_order: 14 },
    { id: 115, player_id: 'P15', name: 'All Rounder B', role: 'all_rounder', ovr: 81, squad_order: 15 }
  ];

  const detailsMap = {};
  initialSquad.forEach(p => {
    detailsMap[p.player_id] = { role: p.role, ovr: p.ovr };
  });

  // Verify dynamic sort in getUserCricketTeam
  const sorted = sortPlayingXI(initialSquad);
  console.log("\n--- Sorted List (getUserCricketTeam) ---");
  sorted.forEach((p, i) => console.log(`${i+1}. ${p.name} (${p.role}, OVR ${p.ovr})`));

  assert.strictEqual(sorted[0].player_id, 'P1');
  assert.strictEqual(sorted[1].player_id, 'P2');
  assert.strictEqual(sorted[2].player_id, 'P8');
  assert.strictEqual(sorted[3].player_id, 'P3');
  assert.strictEqual(sorted[4].player_id, 'P4');
  assert.strictEqual(sorted[5].player_id, 'P5');
  assert.strictEqual(sorted[10].player_id, 'P11');
  assert.strictEqual(sorted[11].player_id, 'P12'); // Bench remains unchanged
  console.log("✅ Initial sort matches expectations!");

  // Test swapping 7 (which is Bowler B, id P6) with 12 (Legend Batsman, id P12)
  console.log("\nSwapping position 7 (Bowler B, P6) with 12 (Legend Batsman, P12)...");
  const postSwap = mockSwapSquadOrder(sorted, detailsMap, 7, 12);

  console.log("\n--- Post-Swap Sorted List ---");
  postSwap.forEach((p, i) => console.log(`${i+1}. ${p.name} (${p.role}, OVR ${p.ovr})`));

  assert.strictEqual(postSwap[0].player_id, 'P12'); // Legend Batsman (batsman, 95)
  assert.strictEqual(postSwap[1].player_id, 'P1');  // Batsman A (batsman, 85)
  assert.strictEqual(postSwap[2].player_id, 'P2');  // Batsman B (batsman, 80)
  assert.strictEqual(postSwap[3].player_id, 'P8');  // Batsman C (batsman, 75)
  assert.strictEqual(postSwap[4].player_id, 'P3');  // WK A (88)
  assert.strictEqual(postSwap[5].player_id, 'P4');  // ALR A (90)
  assert.strictEqual(postSwap[6].player_id, 'P5');  // Bowler A (82)
  assert.strictEqual(postSwap[11].player_id, 'P6'); // Bowler B (P6) is now at index 11 (position 12)

  // Verify squad_order is sequential
  for (let i = 0; i < postSwap.length; i++) {
    assert.strictEqual(postSwap[i].squad_order, i + 1);
  }

  console.log("\n✅ Swap and sorting logic validated perfectly!");
  console.log("All unit tests passed successfully!\n");
}

runTests();
