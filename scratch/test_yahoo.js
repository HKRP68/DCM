const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9'
};

async function testYahoo(playerName) {
  try {
    const url = `https://search.yahoo.com/search?p=site:cricbuzz.com/profiles+${encodeURIComponent(playerName)}`;
    console.log(`Searching Yahoo: ${url}`);
    const res = await axios.get(url, { headers, timeout: 6000 });
    
    const $ = cheerio.load(res.data);
    let profileLink = null;
    
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.includes('cricbuzz.com/profiles/')) {
        profileLink = href;
        return false; // break
      }
    });
    
    if (profileLink) {
      console.log(`Found Cricbuzz Link on Yahoo: ${profileLink}`);
      const match = profileLink.match(/\/profiles\/(\d+)/);
      if (match && match[1]) {
        console.log(`Extracted ID: ${match[1]}`);
        return match[1];
      }
    } else {
      console.log("No Cricbuzz profiles found on Yahoo.");
    }
  } catch (err) {
    console.error("Yahoo lookup failed:", err.message);
  }
}

testYahoo("Virat Kohli");
testYahoo("Navdeep Saini");
