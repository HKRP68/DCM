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
    
    const populated = rows.filter(r => {
      const stats = r.state_json.stats;
      return stats && Object.keys(stats).length > 0;
    });

    if (populated.length > 0) {
      const match = populated[0].state_json;
      console.log("Host XI player IDs & names:");
      match.host.xi.forEach(p => {
        console.log(`  id: ${p.id}, name: ${p.name}`);
      });
      console.log("Stats keys:");
      console.log(Object.keys(match.stats));
    }
  } catch(e) {
    console.error(e);
  }
}
test();
