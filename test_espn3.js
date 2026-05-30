const axios = require('axios');
const { EspnCricinfoClient } = require('espncricinfo');
const client = new EspnCricinfoClient();

async function searchAndStats() {
    try {
        const query = "Virat Kohli";
        console.log("Searching for:", query);
        
        // Cricinfo has a search endpoint
        // hs-consumer-api.espncricinfo.com/v1/pages/search/options?query=virat
        // Let's try searching hs-consumer-api
        const { data } = await axios.get(`https://hs-consumer-api.espncricinfo.com/v1/pages/search/options?query=Virat%20Kohli`);
        
        console.log("Search response:");
        console.log(data);
        
        // if we get an id we can use client.player.getPlayerStats(id)
    } catch(e) {
        console.error("Failed", e.message);
    }
}
searchAndStats();
