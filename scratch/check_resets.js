require('dotenv').config();
const sb = require('../db/supabase');

async function checkResets() {
  if (!sb.supabase) {
    console.error("Supabase client not initialized.");
    return;
  }

  const { data, error } = await sb.supabase
    .from('cricketplayers')
    .select('id, name, image_url')
    .in('name', ['Will Young', 'Nick Winter', 'Ben Allison', 'Prashant Chopra']);

  if (error) {
    console.error("Error fetching reset status:", error);
  } else {
    console.log("Database status of reset players:");
    console.log(data);
  }
}

checkResets();
