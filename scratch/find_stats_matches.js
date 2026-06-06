const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  try {
    const { data: rows, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('status', 'completed')
      .limit(50);
    
    if (error) {
      console.error(error);
      return;
    }

    const populated = rows.filter(r => {
      const stats = r.state_json.stats;
      return stats && Object.keys(stats).length > 0;
    });

    console.log("Total completed matches fetched:", rows.length);
    console.log("Matches with non-empty stats:", populated.length);
    if (populated.length > 0) {
      console.log("Sample match stats structure:", JSON.stringify(populated[0].state_json.stats, null, 2));
      console.log("Sample match details:", {
        host: populated[0].state_json.host.username,
        guest: populated[0].state_json.guest ? populated[0].state_json.guest.username : 'None',
        totalOvers: populated[0].state_json.totalOvers
      });
    }
  } catch(e) {
    console.error(e);
  }
}
test();
