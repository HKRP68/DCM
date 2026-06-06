require('dotenv').config();
const sb = require('../db/supabase');

async function checkMissingImages() {
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

  const missing = players.filter(p => !p.image_url);
  const total = players.length;

  console.log(`Total Players: ${total}`);
  console.log(`Players with Image: ${total - missing.length}`);
  console.log(`Players missing Image: ${missing.length} (${((missing.length / total) * 100).toFixed(1)}%)`);
}

checkMissingImages();
