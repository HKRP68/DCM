const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function getCricbuzzPlayerImage(playerName) {
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=site:cricbuzz.com/profiles+${encodeURIComponent(playerName)}`;
    console.log(`Searching DDG: ${searchUrl}`);
    const res = await axios.get(searchUrl, { headers, timeout: 6000 });
    
    const $ = cheerio.load(res.data);
    let profileLink = null;
    
    // DuckDuckGo result links have class 'result__url' or inside 'a.result__snippet' / 'a.result__url'
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('cricbuzz.com/profiles/')) {
        profileLink = href;
        return false; // break
      }
    });
    
    if (!profileLink) {
      console.log(`No Cricbuzz profile found for: ${playerName}`);
      return null;
    }
    
    console.log(`Found raw link: ${profileLink}`);
    // DDG redirect links format: /l/?kh=-1&uddg=https%3A%2F%2Fwww.cricbuzz.com%2Fprofiles%2F1413%2Fvirat-kohli
    let cleanLink = profileLink;
    if (profileLink.includes('uddg=')) {
      const parts = profileLink.split('uddg=');
      cleanLink = decodeURIComponent(parts[1].split('&')[0]);
      console.log(`Decoded link: ${cleanLink}`);
    }
    
    const match = cleanLink.match(/\/profiles\/(\d+)/);
    if (match && match[1]) {
      const id = match[1];
      const imageUrl = `https://www.cricbuzz.com/a/img/v1/152x152/i/c${id}.jpg`;
      console.log(`Cricbuzz Image URL: ${imageUrl}`);
      return imageUrl;
    }
    
    return null;
  } catch (err) {
    console.error("DDG lookup failed:", err.message);
    return null;
  }
}

async function run() {
  await getCricbuzzPlayerImage("Virat Kohli");
  await getCricbuzzPlayerImage("Navdeep Saini");
  await getCricbuzzPlayerImage("Mitchell Santner");
}

run();
