const cricinfo = require('espncricinfo');

async function test() {
    try {
        console.log("Keys available in espncricinfo:");
        console.log(Object.keys(cricinfo));
        
        // Try searching for a player and getting their detailed stats
        // Assume there is a search or getAthlete or similar
        // Let's guess the API surface
        // If there is a getPlayer function we will invoke it.
    } catch(e) {
        console.error(e);
    }
}
test();
