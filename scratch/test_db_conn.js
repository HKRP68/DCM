const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ipyiazqxdanxdtdchbpn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlweWlhenF4ZGFueGR0ZGNoYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzYxMTYsImV4cCI6MjA4ODcxMjExNn0.3ybTSv6bZsWonYHewgjOJsjnKDyMIU4-Fig9ivHN5pA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing connection to Crickidex Supabase...");
  try {
    const { data: players, error } = await supabase.from('players').select('id, name, ovr').limit(5);
    if (error) {
      console.error("Query players error:", error);
    } else {
      console.log("Connected successfully! Sample players:", players);
    }
  } catch (e) {
    console.error("Exception occurred:", e);
  }
}

test();
