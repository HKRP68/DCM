require('dotenv').config();
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const sb = require('../db/supabase');

const headers = { 'User-Agent': 'CrickidexBot/1.0 (https://github.com/Aswath1209/UnderCover; contact@example.com)' };

const cricketImageCache = new Map();
const crickidexPlayersDir = path.join(__dirname, '..', 'assets', 'players');

// Load local player images into a Map for fast case-insensitive matching
try {
    if (fs.existsSync(crickidexPlayersDir)) {
        const files = fs.readdirSync(crickidexPlayersDir);
        files.forEach(file => {
            if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.jpeg')) {
                cricketImageCache.set(file.toLowerCase(), file);
            }
        });
        console.log(`[Local Cache] Loaded ${cricketImageCache.size} images from ${crickidexPlayersDir}.`);
    } else {
        console.warn(`[Local Cache] Players directory not found at: ${crickidexPlayersDir}`);
    }
} catch (error) {
    console.error('[Local Cache] Error building image cache:', error);
}

// Check if a player has a matching local image file
function getCricketPlayerLocalImageRelativePath(name) {
    if (!name) return null;
    
    // 1. Try formatted First_Last.jpg
    const formattedName = name.trim().replace(/\s+/g, '_').toLowerCase();
    const filenameJpg = `${formattedName}.jpg`;
    if (cricketImageCache.has(filenameJpg)) {
        return `/assets/players/${cricketImageCache.get(filenameJpg)}`;
    }
    
    // 2. Try removing special characters
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
    const cleanFilenameJpg = `${cleanName}.jpg`;
    if (cricketImageCache.has(cleanFilenameJpg)) {
        return `/assets/players/${cleanFilenameJpg}`;
    }

    // 3. Try matches in filename list where the filename contains all parts of the name
    const nameParts = formattedName.split('_');
    if (nameParts.length > 0) {
        for (const [key, value] of cricketImageCache.entries()) {
            if (nameParts.every(part => key.includes(part))) {
                return `/assets/players/${value}`;
            }
        }
    }
    
    return null;
}

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

function verifyTitleMatch(playerName, wikiTitle) {
  const cleanPlayer = cleanPlayerName(playerName).toLowerCase();
  // Strip anything in parentheses, e.g. "Daryl Mitchell (cricketer)" -> "Daryl Mitchell"
  const cleanWiki = wikiTitle.replace(/\s*\(.*\)\s*/g, '').trim().toLowerCase();
  
  if (cleanPlayer === cleanWiki) return true;
  
  const playerParts = cleanPlayer.split(/\s+/);
  const wikiParts = cleanWiki.split(/\s+/);
  
  if (playerParts.length === 0 || wikiParts.length === 0) return false;
  
  const playerLast = playerParts[playerParts.length - 1];
  const wikiLast = wikiParts[wikiParts.length - 1];
  
  if (playerLast !== wikiLast) return false;
  
  const playerFirst = playerParts[0];
  const wikiFirst = wikiParts[0];
  
  if (playerFirst.length === 1) {
    return wikiFirst.startsWith(playerFirst);
  }
  if (wikiFirst.length === 1) {
    return playerFirst.startsWith(wikiFirst);
  }
  
  if (wikiFirst.startsWith(playerFirst) || playerFirst.startsWith(wikiFirst)) {
    return true;
  }
  
  return false;
}

function verifyDescription(desc, title) {
  if (!desc) return true; // If no description is available, allow (fallback to title matching)
  
  const cleanDesc = desc.toLowerCase();
  const cleanTitle = title.toLowerCase();
  
  // Positive matches
  if (cleanDesc.includes('cricket') || cleanDesc.includes('cricketer') || cleanTitle.includes('cricketer')) {
    return true;
  }
  
  // Forbidden professions for pages that do NOT explicitly mention cricket/cricketer
  const forbidden = [
    'singer', 'actor', 'actress', 'politician', 'musician', 'artist', 
    'writer', 'band', 'wrestler', 'film', 'movie', 'bassist', 'composer',
    'jumper', 'swimmer', 'cyclist', 'athlete', 'runner', 'footballer', 
    'rugby', 'baseball', 'tennis', 'basketball', 'golfer', 'boxer',
    'racer', 'driver', 'soldier', 'general', 'president', 'minister'
  ];
  for (const word of forbidden) {
    if (cleanDesc.includes(word)) {
      return false; // Definitely not our cricketer!
    }
  }
  
  return true;
}

async function getPlayerImage(playerName) {
  try {
    const cleanedName = cleanPlayerName(playerName);
    
    // Step 1: Direct match with cleaned name (fetching description too)
    const directUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(cleanedName)}&prop=pageimages|description&format=json&pithumbsize=500&origin=*`;
    let directRes;
    try {
      directRes = await axios.get(directUrl, { headers, timeout: 6000 });
    } catch (err) {
      if (err.response?.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      throw err;
    }
    
    const pages = directRes.data?.query?.pages;
    if (pages) {
      const pageId = Object.keys(pages)[0];
      if (pageId !== '-1' && pages[pageId]?.thumbnail?.source) {
        const title = pages[pageId].title;
        const description = pages[pageId].description || '';
        
        if (verifyTitleMatch(playerName, title) && verifyDescription(description, title)) {
          return { url: pages[pageId].thumbnail.source, title };
        } else {
          console.log(`  -> Direct match rejected: "${title}" (Desc: "${description}") vs player "${playerName}"`);
        }
      }
    }

    // Step 2: Fallback search with cleaned query
    const searchQuery = getSearchQuery(playerName);
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;
    let searchRes;
    try {
      searchRes = await axios.get(searchUrl, { headers, timeout: 6000 });
    } catch (err) {
      if (err.response?.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      throw err;
    }
    
    const searchResults = searchRes.data?.query?.search;
    if (!searchResults || searchResults.length === 0) {
      return null;
    }

    // Try top 3 search results to find a verified name match
    const candidates = searchResults.slice(0, 3);
    for (const candidate of candidates) {
      const bestTitle = candidate.title;
      
      if (verifyTitleMatch(playerName, bestTitle)) {
        // Query image and description for this candidate
        const imgUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestTitle)}&prop=pageimages|description&format=json&pithumbsize=500&origin=*`;
        let imgRes;
        try {
          imgRes = await axios.get(imgUrl, { headers, timeout: 6000 });
        } catch (err) {
          if (err.response?.status === 429) {
            throw new Error("RATE_LIMIT");
          }
          throw err;
        }
        
        const fallbackPages = imgRes.data?.query?.pages;
        if (fallbackPages) {
          const pageId = Object.keys(fallbackPages)[0];
          if (fallbackPages[pageId]?.thumbnail?.source) {
            const description = fallbackPages[pageId].description || '';
            if (verifyDescription(description, bestTitle)) {
              return { url: fallbackPages[pageId].thumbnail.source, title: bestTitle };
            } else {
              console.log(`  -> Search candidate description mismatch: "${bestTitle}" (Desc: "${description}") vs player "${playerName}"`);
            }
          }
        }
      } else {
        console.log(`  -> Search candidate title mismatch: "${bestTitle}" vs player "${playerName}"`);
      }
    }
    
    return null;
  } catch (err) {
    if (err.message === "RATE_LIMIT") {
      throw err;
    }
    console.error(`  [WIKI ERROR] ${playerName}: ${err.message}`);
    return null;
  }
}

// Sleep helper
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function populateImages() {
  if (!sb.supabase) {
    console.error("Supabase client not initialized.");
    return;
  }

  // Reset previous incorrect mappings first
  console.log("Resetting incorrect database mappings to null...");
  const { error: resetError } = await sb.supabase
    .from('cricketplayers')
    .update({ image_url: null })
    .in('name', ['Prashant Chopra', 'Will Young', 'Ben Allison', 'Nick Winter']);
    
  if (resetError) {
    console.error("Error resetting incorrect mappings:", resetError);
  } else {
    console.log("Successfully reset incorrect mappings.");
  }

  console.log("Loading players without images from database...");
  const { data: players, error } = await sb.supabase
    .from('cricketplayers')
    .select('id, name')
    .is('image_url', null);

  if (error) {
    console.error("Error loading players:", error);
    return;
  }

  console.log(`Found ${players.length} players missing an image_url.`);
  if (players.length === 0) {
    console.log("No images to populate!");
    return;
  }

  let updatedCount = 0;
  let skippedCount = 0;
  let processedWikiCount = 0;
  
  const wikiPlayers = [];
  
  console.log("Checking local images for all players first...");
  for (const p of players) {
    const localRelativePath = getCricketPlayerLocalImageRelativePath(p.name);
    if (localRelativePath) {
      console.log(`  -> Player "${p.name}" matches local asset: ${localRelativePath}. Updating DB...`);
      const { error: updateErr } = await sb.supabase
        .from('cricketplayers')
        .update({ image_url: localRelativePath })
        .eq('id', p.id);
        
      if (!updateErr) {
        skippedCount++;
      } else {
        console.error(`  -> [DB ERROR] Local update for ${p.name} failed: ${updateErr.message}`);
      }
    } else {
      wikiPlayers.push(p);
    }
  }
  
  console.log(`\nLocal sync finished. Updated ${skippedCount} players with local assets.`);
  console.log(`Remaining players to check via Wikipedia API: ${wikiPlayers.length}`);
  
  if (wikiPlayers.length === 0) {
    console.log("No players left for Wikipedia migration!");
    return;
  }
  
  // Configurable batch size
  const BATCH_LIMIT = 150;
  const batch = wikiPlayers.slice(0, BATCH_LIMIT);
  console.log(`Starting Wikipedia image retrieval batch of ${batch.length} players...`);
  
  try {
    for (let i = 0; i < batch.length; i++) {
      const p = batch[i];
      const indexStr = `[${i + 1}/${batch.length}]`;
      
      console.log(`${indexStr} Querying Wikipedia for: ${p.name}...`);
      
      const result = await getPlayerImage(p.name);
      processedWikiCount++;
      
      if (result && result.url) {
        console.log(`  -> FOUND on Wikipedia: ${result.title} -> ${result.url}`);
        const { error: updateErr } = await sb.supabase
          .from('cricketplayers')
          .update({ image_url: result.url })
          .eq('id', p.id);
  
        if (!updateErr) {
          updatedCount++;
        } else {
          console.error(`  -> [DB ERROR] ${p.name}: ${updateErr.message}`);
        }
      } else {
        console.log(`  -> NOT FOUND on Wikipedia. Marking image_url as empty string.`);
        const { error: updateErr } = await sb.supabase
          .from('cricketplayers')
          .update({ image_url: '' })
          .eq('id', p.id);
          
        if (updateErr) {
          console.error(`  -> [DB ERROR] Failed to mark empty image_url for ${p.name}: ${updateErr.message}`);
        }
      }
  
      // Wait 1500ms to respect Wikipedia rate limits
      await sleep(1500);
    }
  } catch (err) {
    if (err.message === "RATE_LIMIT") {
      console.warn("\n[RATE LIMIT TRIGGERED] Wikipedia returned 429 Too Many Requests. Pausing migration to cool down.");
    } else {
      console.error("\n[FATAL ERROR] Unexpected error during migration:", err);
    }
  }
  
  console.log(`\nBatch migration status:`);
  console.log(`- Local assets synced: ${skippedCount}`);
  console.log(`- Wikipedia players queried: ${processedWikiCount}`);
  console.log(`- Wikipedia images resolved and saved: ${updatedCount}`);
  console.log(`- Unresolved players marked empty: ${processedWikiCount - updatedCount}`);
}

populateImages();
