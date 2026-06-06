const axios = require('axios');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Referer': 'https://www.cricbuzz.com/'
};

async function test(path) {
  try {
    console.log(`Testing URL: ${path}`);
    const res = await axios.get(path, { headers, timeout: 5000 });
    console.log(`Success! Status: ${res.status}`);
    console.log(JSON.stringify(res.data).substring(0, 500));
  } catch (err) {
    console.log(`Failed: ${err.message}`);
  }
}

async function run() {
  await test('https://www.cricbuzz.com/api/search/results?q=virat');
  await test('https://www.cricbuzz.com/api/autocomplete/search?q=virat');
  await test('https://www.cricbuzz.com/search/ac?q=virat');
  await test('https://www.cricbuzz.com/search/suggest?q=virat');
}

run();
