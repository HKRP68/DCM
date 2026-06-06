require('dotenv').config();
const sb = require('../db/supabase');

async function inspectResolvedImages() {
  if (!sb.supabase) {
    console.error("Supabase client not initialized.");
    return;
  }

  const { data: players, error } = await sb.supabase
    .from('cricketplayers')
    .select('id, name, image_url');

  if (error) {
    console.error("Error loading players:", error);
    return;
  }

  const wikiPlayers = players.filter(p => p.image_url && p.image_url.startsWith('https://upload.wikimedia.org'));
  
  console.log(`\n--- Total Newly Resolved Wikipedia Images: ${wikiPlayers.length} ---\n`);
  console.log("Sample of 15 newly resolved players with their image URLs:");
  wikiPlayers.slice(0, 15).forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.name} (ID: ${p.id}) -> ${p.image_url}`);
  });
}

inspectResolvedImages();
