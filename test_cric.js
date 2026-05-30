const { getPlayerInfo } = require('cric-player-info');

async function test() {
    try {
        console.log("Testing cric-player-info for Virat Kohli...");
        const info = await getPlayerInfo("Virat Kohli");
        console.log(JSON.stringify(info, null, 2));
    } catch(e) {
        console.error("Failed getPlayerInfo", e);
    }
}
test();
