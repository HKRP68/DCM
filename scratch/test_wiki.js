const axios = require('axios');

async function getPlayerImage(playerName) {
  const headers = { 'User-Agent': 'CrickidexBot/1.0 (https://github.com/Aswath1209/UnderCover; contact@example.com)' };
  
  try {
    // Step 1: Try direct page lookup by exact name
    const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(playerName)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const directRes = await axios.get(directUrl, { headers });
    const pages = directRes.data?.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pageId !== '-1' && pages[pageId]?.thumbnail?.source) {
        return pages[pageId].thumbnail.source;
      }
    }

    // Step 2: Fallback to searching "<playerName> cricket"
    console.log(`Direct lookup failed for "${playerName}", trying search fallback...`);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(playerName + ' cricket')}&format=json&origin=*`;
    const searchRes = await axios.get(searchUrl, { headers });
    
    const searchResults = searchRes.data?.query?.search;
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    const bestTitle = searchResults[0].title;
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestTitle)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const imgRes = await axios.get(imgUrl, { headers });
    const fallbackPages = imgRes.data?.query?.pages;
    if (fallbackPages) {
      const pageId = Object.keys(fallbackPages)[0];
      return fallbackPages[pageId]?.thumbnail?.source || null;
    }
    
    return null;
  } catch (err) {
    console.error(`Error resolving image for ${playerName}:`, err.message);
    return null;
  }
}

async function run() {
  const testPlayers = ['Babar Azam', 'Jasprit Bumrah', 'Mitchell Santner', 'Glenn Maxwell'];
  for (const name of testPlayers) {
    const img = await getPlayerImage(name);
    console.log(`Result [${name}]: ${img}\n`);
  }
}

run();
