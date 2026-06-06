const axios = require('axios');
const fs = require('fs');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.cricbuzz.com/'
};

async function testDownload() {
  try {
    const url = 'https://www.cricbuzz.com/a/img/v1/152x152/i/c1413.jpg';
    console.log(`Downloading: ${url}`);
    const res = await axios.get(url, { headers, responseType: 'arraybuffer', timeout: 5000 });
    console.log("Success! Status:", res.status);
    console.log("Buffer length:", res.data.length);
    fs.writeFileSync('scratch/cricbuzz_test.jpg', Buffer.from(res.data));
  } catch (err) {
    console.error("Cricbuzz download failed:", err.message);
  }
}

testDownload();
