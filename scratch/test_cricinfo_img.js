const axios = require('axios');
const cheerio = require('cheerio');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/'
};

async function getCricinfoImage(id) {
  try {
    const url = `https://www.espncricinfo.com/cricketers/player-${id}`;
    console.log(`Fetching Cricinfo page: ${url}`);
    const res = await axios.get(url, { headers, timeout: 8000 });
    
    const $ = cheerio.load(res.data);
    
    // Cricinfo player profile headshot is usually in a specific image tag
    // Let's find all images on the page and filter them
    let headshotUrl = null;
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      // Cricinfo images are often hosted on img1.ws.indiatvnews.com or similar CDNs or have "player" in URL
      if (src && (src.includes('/players/') || src.includes('w=') || src.includes('h='))) {
        // Let's print candidate images
        console.log(`Candidate: ${src}`);
        if (src.includes('/players/') && (src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.jpeg') || src.includes('format=auto'))) {
          headshotUrl = src;
        }
      }
    });
    
    if (headshotUrl) {
      console.log(`Found Headshot URL: ${headshotUrl}`);
    } else {
      console.log("No headshot image matched criteria.");
    }
  } catch (err) {
    console.error("Failed to load Cricinfo page:", err.message);
  }
}

getCricinfoImage("253802"); // Virat Kohli
getCricinfoImage("700167"); // Navdeep Saini
