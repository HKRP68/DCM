require('dotenv').config({ path: 'undercover-bot/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
    console.log("Attempting to insert test record into bonus_claims...");
    const { error } = await supabase.from('bonus_claims').insert({ user_id: 12345 });
    
    if (error) {
        console.error("Insert failed:", error.message);
    } else {
        console.log("Insert successful!");
        const { count } = await supabase.from('bonus_claims').select('*', { count: 'exact', head: true });
        console.log("New count:", count);
    }
}

test();
