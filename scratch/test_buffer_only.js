const { loadImage } = require('@napi-rs/canvas');
const axios = require('axios');

const testUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Shaun_Pollock.JPG';

async function run() {
  console.log('Testing loadImage(buffer) using axios with User-Agent...');
  try {
    const response = await axios.get(testUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const buffer = Buffer.from(response.data);
    const img = await loadImage(buffer);
    console.log('Buffer loadImage worked!', img.width, 'x', img.height);
  } catch (err) {
    console.error('Buffer loadImage failed:', err.message);
  }
}

run();
