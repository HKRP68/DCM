const axios = require('axios');
const fs = require('fs');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function run() {
  try {
    const url = 'https://html.duckduckgo.com/html/?q=site:cricbuzz.com/profiles+Virat+Kohli';
    const res = await axios.get(url, { headers });
    console.log("Body length:", res.data.length);
    console.log("Contains cricbuzz:", res.data.includes('cricbuzz'));
    fs.writeFileSync('scratch/ddg_resp.html', res.data);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

run();
