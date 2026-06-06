const axios = require('axios');

const headers = { 'User-Agent': 'CrickidexBot/1.0 (https://github.com/Aswath1209/UnderCover; contact@example.com)' };

function cleanPlayerName(name) {
  let cleaned = name.trim();
  
  // Replace common abbreviations
  if (/^Mohd\.?\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^Mohd\.?\s+/i, "Mohammed ");
  }
  if (/^Ab\.?\s+/i.test(cleaned)) {
    cleaned = cleaned.replace(/^Ab\.?\s+/i, "AB ");
  }
  
  return cleaned;
}

function getSearchQuery(name) {
  let cleaned = cleanPlayerName(name);
  const parts = cleaned.split(/\s+/);
  
  // If first part is a single letter (optionally with dot) or "Tm"/"TM"
  if (parts.length > 1 && (/^[A-Za-z]\.?$/i.test(parts[0]) || /^Tm\.?$/i.test(parts[0]))) {
    return parts.slice(1).join(' ') + ' cricket';
  }
  
  return cleaned + ' cricket';
}

async function getPlayerImage(playerName) {
  try {
    const cleanedName = cleanPlayerName(playerName);
    
    // Step 1: Direct match with cleaned name
    const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanedName)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const directRes = await axios.get(directUrl, { headers, timeout: 6000 });
    const pages = directRes.data?.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pageId !== '-1' && pages[pageId]?.thumbnail?.source) {
        return { source: 'direct', url: pages[pageId].thumbnail.source, title: pages[pageId].title };
      }
    }

    // Step 2: Fallback search with cleaned query
    const searchQuery = getSearchQuery(playerName);
    console.log(`  -> Direct failed for "${cleanedName}". Searching for: "${searchQuery}"...`);
    
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
    const searchRes = await axios.get(searchUrl, { headers, timeout: 6000 });
    const searchResults = searchRes.data?.query?.search;
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    const bestTitle = searchResults[0].title;
    console.log(`  -> Found search result: "${bestTitle}". Fetching image...`);
    const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestTitle)}&prop=pageimages&format=json&pithumbsize=500&origin=*`;
    const imgRes = await axios.get(imgUrl, { headers, timeout: 6000 });
    const fallbackPages = imgRes.data?.query?.pages;
    if (fallbackPages) {
      const pageId = Object.keys(fallbackPages)[0];
      if (fallbackPages[pageId]?.thumbnail?.source) {
        return { source: 'search', url: fallbackPages[pageId].thumbnail.source, title: bestTitle };
      }
    }
    
    return null;
  } catch (err) {
    console.error(`  [WIKI ERROR] ${playerName}: ${err.message}`);
    return null;
  }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  const testPlayers = [
    'M Labuschagne',
    'D Chameera',
    'T. Natarajan',
    'Ab De Villiers',
    'Mohd Siraj',
    'Tm Dilshan',
    'Q De Kock',
    'Gerald Coetzee',
    'Alyssa Healy',
    'Tony de Zorzi'
  ];

  for (const name of testPlayers) {
    console.log(`Resolving: ${name}`);
    const result = await getPlayerImage(name);
    if (result) {
      console.log(`  RESULT: [${result.source}] ${result.title} -> ${result.url}`);
    } else {
      console.log(`  RESULT: NOT FOUND`);
    }
    await sleep(1000); // 1s delay
  }
}

run();
