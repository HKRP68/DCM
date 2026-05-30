const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env file manually
function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return env;
}

const cEnv = loadEnv(path.join(__dirname, '..', 'cricket-bot', '.env'));

const supabase = createClient(cEnv.SUPABASE_URL, cEnv.SUPABASE_KEY);

async function inspect() {
  console.log("Inspecting alternative Supabase database...");
  console.log("URL:", cEnv.SUPABASE_URL);

  // Try querying common table names in this other DB
  const tables = ['cricket_players', 'players', 'cricket_player', 'cricket_stats', 'player_list'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}' error:`, error.message);
      } else if (data && data.length > 0) {
        console.log(`\nFound Table: '${table}'`);
        console.log("Columns & Sample Row:", data[0]);
      } else if (data) {
        console.log(`Found empty table: '${table}'`);
      }
    } catch (e) {
      console.log(`Failed to query table '${table}':`, e.message);
    }
  }
}

inspect();
