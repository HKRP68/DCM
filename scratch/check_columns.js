const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.error("Error querying profiles:", error);
    } else {
      console.log("Success! Columns in profiles:", data.length > 0 ? Object.keys(data[0]) : "No rows in profiles table");
    }
  } catch (e) {
    console.error("Exception occurred:", e);
  }
}

check();
