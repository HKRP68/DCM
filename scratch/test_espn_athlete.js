const axios = require('axios');

async function testAthlete(id) {
  try {
    const url = `https://sports.core.api.espn.com/v2/sports/cricket/athletes/${id}`;
    console.log(`Querying ESPN Athlete API: ${url}`);
    const res = await axios.get(url, { timeout: 6000 });
    console.log("Success!");
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("ESPN Athlete API query failed:", err.message);
  }
}

testAthlete("253802");
