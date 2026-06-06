const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function inspect() {
  try {
    const { data: players, error } = await supabase.from('cricketplayers').select('id, name, image_url');
    if (error) {
      console.error("DB Query error:", error.message);
      return;
    }
    
    console.log(`Total Players in DB: ${players.length}`);
    const withImages = players.filter(p => p.image_url && p.image_url.trim() !== '');
    const withoutImages = players.filter(p => !p.image_url || p.image_url.trim() === '');
    
    console.log(`Players WITH image_url: ${withImages.length}`);
    console.log(`Players WITHOUT image_url: ${withoutImages.length}`);
    
    console.log("\nSample players with image_url:");
    console.log(withImages.slice(0, 10));
    
    console.log("\nSample players without image_url:");
    console.log(withoutImages.slice(0, 10));
  } catch (err) {
    console.error("Failed to inspect player images:", err);
  }
}

inspect();
