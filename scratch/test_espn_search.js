const axios = require('axios');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://www.espncricinfo.com',
  'Referer': 'https://www.espncricinfo.com/'
};

async function test(query) {
  try {
    console.log(`Searching ESPN Cricinfo for: ${query}`);
    const url = `https://hs-consumer-api.espncricinfo.com/v1/pages/search/options?query=${encodeURIComponent(query)}`;
    const res = await axios.get(url, { headers, timeout: 5000 });
    console.log("Success! Status:", res.status);
    console.log(JSON.stringify(res.data, null, 2).substring(0, 1000));
  } catch (err) {
    console.log(`Failed: ${err.message}`);
    if (err.response) {
      console.log("Response headers:", err.response.headers);
    }
  }
}

test("Virat Kohli");
