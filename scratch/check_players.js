require('dotenv').config();
const sb = require('../db/supabase');

async function check() {
  const players = await sb.getCricketPlayers();
  console.log(`Total cricket players: ${players.length}`);
  const virats = players.filter(p => p.name.toLowerCase().includes('virat'));
  console.log("Virat players:", virats);
}

check();
