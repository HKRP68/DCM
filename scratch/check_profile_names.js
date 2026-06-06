require('dotenv').config();
const sb = require('../db/supabase');

async function checkProfiles() {
  if (!sb.supabase) {
    console.error("Supabase client not initialized.");
    return;
  }

  const { data: profiles, error } = await sb.supabase
    .from('profiles')
    .select('user_id, first_name, coins, wins, matches_played');

  if (error) {
    console.error("Error loading profiles:", error);
    return;
  }

  console.log(`\n--- Supabase Profiles (${profiles.length}) ---\n`);
  profiles.forEach(p => {
    console.log(`User ID: ${p.user_id} | Name: "${p.first_name}" | Coins: ${p.coins} | Wins: ${p.wins}`);
  });
}

checkProfiles();
