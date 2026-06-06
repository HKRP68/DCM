const axios = require('axios');
const headers = { 'User-Agent': 'CrickidexBot/1.0 (contact@example.com)' };

async function test(playerName) {
  console.log(`\nTesting player: ${playerName}`);
  const cleanedName = playerName.trim();
  
  // Direct query
  const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanedName)}&prop=pageimages|description&format=json&pithumbsize=500&origin=*`;
  const res = await axios.get(directUrl, { headers });
  const pages = res.data?.query?.pages;
  
  if (pages) {
    const pageId = Object.keys(pages)[0];
    if (pageId !== '-1') {
      console.log("Direct Match Page Found:", pages[pageId].title);
      console.log("Thumbnail:", pages[pageId]?.thumbnail?.source);
      console.log("Description:", pages[pageId].description);
      return;
    }
  }
  
  // Search query
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(playerName + ' cricket')}&format=json&origin=*`;
  const searchRes = await axios.get(searchUrl, { headers });
  const searchResults = searchRes.data?.query?.search;
  console.log("Search Results:", searchResults ? searchResults.slice(0, 3).map(r => r.title) : []);
}

test("Navdeep Saini");
test("Tom Latham");
test("Lukman Meriwala");
