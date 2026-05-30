require('dotenv').config();
const sb = require('../db/supabase');
const footballPlayers = require('../data/footballPlayers.json');

// Mock escapeHTML
function escapeHTML(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function testSell() {
  const userId = 7361215114; // A test user
  const query = 'Virat'; // Looking up Virat Kohli or Virat Singh
  
  const owned = await sb.getUserOwnedPlayers(userId);
  console.log(`Owned players: ${owned.length}`);
  
  const cricketFromDb = await sb.getCricketPlayers();
  
  const matches = [];

  // Check Cricket players
  const ownedCricketIds = owned.filter(o => o.sport === 'cricket').map(o => o.player_id);
  const matchedCricket = cricketFromDb.filter(p => 
    ownedCricketIds.includes(p.id) && 
    p.name.toLowerCase().includes(query.toLowerCase())
  );
  matchedCricket.forEach(p => {
    matches.push({
      id: p.id,
      name: p.name,
      ovr: p.ovr,
      buy_price: p.buy_price,
      sport: 'cricket'
    });
  });

  // Check Football players
  const ownedFootballIds = owned.filter(o => o.sport === 'football').map(o => o.player_id);
  const matchedFootball = footballPlayers.filter(p => 
    ownedFootballIds.includes(p.id) && 
    p.name.toLowerCase().includes(query.toLowerCase())
  );
  matchedFootball.forEach(p => {
    matches.push({
      id: p.id,
      name: p.name,
      ovr: p.ovr,
      buy_price: p.buy_price,
      sport: 'football'
    });
  });

  console.log(`Matches found for "${query}":`, matches);

  if (matches.length > 1) {
    const exactMatch = matches.find(p => p.name.toLowerCase() === query.toLowerCase());
    if (exactMatch) {
      console.log("Exact match found, choosing:", exactMatch);
    } else {
      const list = matches.map(p => `• ${p.name} (OVR: ${p.ovr}, ${p.sport})`).join('\n');
      console.log("Multiple matches:\n" + list);
    }
  } else if (matches.length === 1) {
    console.log("Single match to sell:", matches[0]);
  } else {
    console.log("No matches found.");
  }
}

testSell().catch(console.error);
