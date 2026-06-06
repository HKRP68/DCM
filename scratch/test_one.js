const axios = require('axios');
const headers = { 'User-Agent': 'CrickidexBot/1.0 (https://github.com/Aswath1209/UnderCover; contact@example.com)' };

async function debug(playerName) {
  try {
    const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(playerName)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const directRes = await axios.get(directUrl, { headers });
    console.log(`Direct lookup for ${playerName}:`);
    console.log(JSON.stringify(directRes.data, null, 2));

    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(playerName + ' cricket')}&format=json&origin=*`;
    const searchRes = await axios.get(searchUrl, { headers });
    console.log(`Search fallback for ${playerName}:`);
    console.log(JSON.stringify(searchRes.data, null, 2));

    if (searchRes.data?.query?.search?.length > 0) {
      const bestTitle = searchRes.data.query.search[0].title;
      const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestTitle)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
      const imgRes = await axios.get(imgUrl, { headers });
      console.log(`Image lookup for best title (${bestTitle}):`);
      console.log(JSON.stringify(imgRes.data, null, 2));
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

debug("Navdeep Saini");
