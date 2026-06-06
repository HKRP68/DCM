const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  try {
    const { data: countData, error: countError } = await supabase
      .from('cricket_matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');
    
    console.log("Completed matches count:", countError ? countError.message : countData);

    const { data: rows, error: rowsError } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('status', 'completed')
      .limit(1);

    if (rowsError) {
      console.error("Error fetching match row:", rowsError.message);
    } else {
      console.log("Sample match row:", JSON.stringify(rows[0], null, 2));
    }
  } catch (e) {
    console.error(e);
  }
}

test();
