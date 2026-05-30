const { EspnCricinfoClient } = require('espncricinfo');

async function test() {
    try {
        const client = new EspnCricinfoClient();
        console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(client)));
        // Might be getPlayer, getAthlete, search, etc.
    } catch(e) {
        console.error(e);
    }
}
test();
