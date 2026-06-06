const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const crickidexPlayersDir = path.join(__dirname, '..', 'assets', 'players');

// Ensure folder exists
if (!fs.existsSync(crickidexPlayersDir)) {
  fs.mkdirSync(crickidexPlayersDir, { recursive: true });
}

async function downloadImage(url, destPath) {
  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    },
    timeout: 10000
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function run() {
  try {
    console.log("Fetching players with remote images...");
    const { data: players, error } = await supabase
      .from('cricketplayers')
      .select('id, name, image_url');

    if (error) {
      console.error("DB Query error:", error.message);
      return;
    }

    const remotePlayers = players.filter(p => p.image_url && p.image_url.startsWith('http'));
    console.log(`Found ${remotePlayers.length} players with remote HTTP image URLs.`);

    let successCount = 0;
    for (let i = 0; i < remotePlayers.length; i++) {
      const p = remotePlayers[i];
      const formattedName = p.name.trim().replace(/\s+/g, '_').toLowerCase();
      const filename = `${formattedName}.jpg`;
      const destPath = path.join(crickidexPlayersDir, filename);

      console.log(`[${i+1}/${remotePlayers.length}] Downloading image for ${p.name} from ${p.image_url}...`);
      try {
        await downloadImage(p.image_url, destPath);
        console.log(`  -> Saved to ${destPath}`);

        // Update database to use local relative path
        const localRelativePath = `/assets/players/${filename}`;
        const { error: dbErr } = await supabase
          .from('cricketplayers')
          .update({ image_url: localRelativePath })
          .eq('id', p.id);

        if (dbErr) {
          console.error(`  -> Failed to update DB for ${p.name}:`, dbErr.message);
        } else {
          console.log(`  -> Updated DB to ${localRelativePath}`);
          successCount++;
        }
      } catch (err) {
        console.error(`  -> Download failed for ${p.name}:`, err.message);
      }

      // Small delay to prevent hitting Wikipedia limits
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\nDownload and local sync finished! Successfully updated ${successCount} players.`);
  } catch (err) {
    console.error("Unexpected error:", err);
  }
}

run();
