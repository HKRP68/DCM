const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Checking if cricket_matches table exists in Supabase...");
  try {
    const { data, error } = await supabase.from('cricket_matches').select('*').limit(1);
    if (error) {
      console.log("Error querying cricket_matches:", error.message);
      console.log("This likely means the table needs to be created using cricket_migration.sql.");
    } else {
      console.log("Success! cricket_matches table exists in database.");
    }
  } catch (e) {
    console.error("Exception occurred:", e);
  }
}

test();
