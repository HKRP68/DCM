require('dotenv').config({ path: 'undercover-bot/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in undercover-bot/.env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Checking bonus_claims table...");
    const { data, error, count } = await supabase.from('bonus_claims').select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error("Error querying bonus_claims:", error.message);
        if (error.message.includes("relation \"bonus_claims\" does not exist")) {
            console.log("TABLE MISSING: The bonus_claims table does not exist in the database.");
        }
    } else {
        console.log("Table exists! Count:", count);
    }
}

test();
