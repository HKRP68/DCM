require('dotenv').config({ path: 'undercover-bot/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(userId) {
    console.log(`Checking user ${userId}...`);
    
    // Check profiles
    const { data: profile, error: pError } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    if (pError) {
        console.log("Profile check error:", pError.message);
    } else {
        console.log("Profile data:", JSON.stringify(profile, null, 2));
    }

    // Check Hilo games
    const { data: hilo, error: hError } = await supabase.from('hilo_games').select('*').eq('user_id', userId).single();
    if (hError) {
        if (hError.code !== 'PGRST116') { // PGRST116 is "no rows found"
            console.log("Hilo check error:", hError.message);
        } else {
            console.log("No active Hilo game found.");
        }
    } else {
        console.log("Active Hilo game found:", JSON.stringify(hilo, null, 2));
    }

    // Check bonus_claims
    const { data: bonus, error: bError } = await supabase.from('bonus_claims').select('*').eq('user_id', userId);
    if (bError) {
        console.log("Bonus claims check error:", bError.message);
    } else {
        console.log(`Total Bonus Claims: ${bonus.length}`);
        if (bonus.length > 0) {
            console.log("Last 3 claims:", JSON.stringify(bonus.slice(-3), null, 2));
        }
    }
}

checkUser('6328832303');
