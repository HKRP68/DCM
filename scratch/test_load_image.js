const { loadImage } = require('@napi-rs/canvas');
const axios = require('axios');

const testUrl = 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Shaun_Pollock.JPG';

async function testDirect() {
  console.log('Testing direct loadImage(url)...');
  try {
    const img = await loadImage(testUrl);
    console.log('Direct loadImage worked!', img.width, 'x', img.height);
  } catch (err) {
    console.error('Direct loadImage failed:', err.message);
  }
}

async function testWithBuffer() {
  console.log('\nTesting loadImage(buffer) using axios with User-Agent...');
  try {
    const response = await axios.get(testUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'CrickidexBot/1.0 (https://github.com/Aswath1209/UnderCover; contact@example.com)'
      }
    });
    const buffer = Buffer.from(response.data);
    const img = await loadImage(buffer);
    console.log('Buffer loadImage worked!', img.width, 'x', img.height);
  } catch (err) {
    console.error('Buffer loadImage failed:', err.message);
  }
}

async function run() {
  await testDirect();
  await testWithBuffer();
}

run();
