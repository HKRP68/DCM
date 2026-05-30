require('dotenv').config();
const sb = require('../db/supabase');

async function run() {
  const userId = 7361215114;
  console.log("Adding Virat Kohli and Virat Singh to owned players...");
  
  // Directly insert into user_owned_players (no balance check)
  const { error: ins1 } = await sb.supabase.from('user_owned_players').insert({
    user_id: userId,
    player_id: '441f36b4-4113-4ff4-84d2-758663b8835f', // Virat Singh
    sport: 'cricket'
  });
  if (ins1) console.error("Error inserting Virat Singh:", ins1);

  const { error: ins2 } = await sb.supabase.from('user_owned_players').insert({
    user_id: userId,
    player_id: 'a8a0dc0c-5ca2-4b2b-8e2d-92dfd27cb153', // Virat Kohli
    sport: 'cricket'
  });
  if (ins2) console.error("Error inserting Virat Kohli:", ins2);

  // Fetch owned players
  const owned = await sb.getUserOwnedPlayers(userId);
  console.log("Owned players now:", owned);

  // Fetch all cricket players from db
  const cricketFromDb = await sb.getCricketPlayers();

  // Match test for "virat"
  const query = "virat";
  const matches = [];
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
  console.log(`Matched players for query "${query}":`, matches);

  // Match test for "virat kohli"
  const query2 = "virat kohli";
  const matches2 = [];
  const matchedCricket2 = cricketFromDb.filter(p => 
    ownedCricketIds.includes(p.id) && 
    p.name.toLowerCase().includes(query2.toLowerCase())
  );
  matchedCricket2.forEach(p => {
    matches2.push({
      id: p.id,
      name: p.name,
      ovr: p.ovr,
      buy_price: p.buy_price,
      sport: 'cricket'
    });
  });
  console.log(`Matched players for query "${query2}":`, matches2);

  // Get user profile before sell
  const profileBefore = await sb.getProfile(userId);
  const coinsBefore = profileBefore ? profileBefore.coins : 0;
  console.log(`Coins before selling Virat Kohli: ${coinsBefore}`);

  // Sell Virat Kohli
  const kohli = matches.find(m => m.name === 'Virat Kohli');
  if (kohli) {
    const sellPrice = Math.round(kohli.buy_price * 0.75);
    console.log(`Selling Virat Kohli for ${sellPrice} coins...`);
    const sellRes = await sb.sellPlayer(userId, kohli.id, 'cricket', sellPrice);
    console.log("Sell response:", sellRes);
  }

  // Cleanup: delete Virat Singh as well so database is clean
  await sb.supabase.from('user_owned_players').delete().eq('user_id', userId);
  console.log("Cleanup complete!");
}

run().catch(console.error);
