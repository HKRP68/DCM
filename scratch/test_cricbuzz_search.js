const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function getCricbuzzPlayerImage(playerName) {
  try {
    const url = `https://www.cricbuzz.com/search/results?q=${encodeURIComponent(playerName)}`;
    console.log(`Searching Cricbuzz: ${url}`);
    const res = await axios.get(url, { headers, timeout: 6000 });
    
    const $ = cheerio.load(res.data);
    
    // Let's find links matching /profiles/ID/name
    let profileLink = null;
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('/profiles/')) {
        profileLink = href;
        return false; // break
      }
    });
    
    if (!profileLink) {
      console.log(`No profile link found for ${playerName} on Cricbuzz.`);
      return null;
    }
    
    console.log(`Found Cricbuzz profile link: ${profileLink}`);
    // Extract ID from e.g. "/profiles/1413/virat-kohli"
    const match = profileLink.match(/\/profiles\/(\d+)\//);
    if (match && match[1]) {
      const id = match[1];
      const imageUrl = `https://www.cricbuzz.com/a/img/v1/152x152/i/c${id}.jpg`;
      console.log(`Cricbuzz Image URL: ${imageUrl}`);
      return imageUrl;
    }
    
    return null;
  } catch (err) {
    console.error("Cricbuzz search failed:", err.message);
    return null;
  }
}

async function run() {
  await getCricbuzzPlayerImage("Virat Kohli");
  await getCricbuzzPlayerImage("Navdeep Saini");
  await getCricbuzzPlayerImage("Mitchell Santner");
}

run();
