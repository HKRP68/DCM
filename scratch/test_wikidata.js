const axios = require('axios');

async function getCricinfoIdFromWiki(title) {
  try {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(title)}&props=claims&format=json`;
    console.log(`Querying Wikidata: ${url}`);
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'CrickidexBot/1.0 (contact@example.com)' }
    });
    
    const entities = res.data?.entities;
    if (!entities) return null;
    
    const qid = Object.keys(entities)[0];
    if (qid === '-1') {
      console.log(`No entity found for title: ${title}`);
      return null;
    }
    
    const claims = entities[qid]?.claims;
    const cricinfoClaim = claims?.P2697; // P2697 is ESPNcricinfo player ID
    
    if (cricinfoClaim && cricinfoClaim[0]?.mainsnak?.datavalue?.value) {
      const id = cricinfoClaim[0].mainsnak.datavalue.value;
      console.log(`Found Cricinfo ID for ${title}: ${id}`);
      return id;
    }
    
    console.log(`No Cricinfo ID property (P2697) on Wikidata for ${title}.`);
    return null;
  } catch (err) {
    console.error("Wikidata query failed:", err.message);
    return null;
  }
}

async function run() {
  await getCricinfoIdFromWiki("Virat Kohli");
  await getCricinfoIdFromWiki("Navdeep Saini");
  await getCricinfoIdFromWiki("Tom Latham");
}

run();
