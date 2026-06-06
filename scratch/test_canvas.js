const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function main() {
  const width = 800;
  const height = 450;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fill dark background
  ctx.fillStyle = '#0b0e14';
  ctx.fillRect(0, 0, width, height);

  // Draw header text
  ctx.fillStyle = '#ff3333';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('MATCH COMPLETED', 50, 80);

  // Load logo
  const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
  console.log('Loading logo from:', logoPath);
  try {
    const logo = await loadImage(logoPath);
    ctx.drawImage(logo, 550, 50, 200, 200);
  } catch (err) {
    console.error('Failed to load logo:', err);
  }

  // Draw some sample score details
  ctx.fillStyle = '#ffffff';
  ctx.font = '24px Arial';
  ctx.fillText('Host XI: 120/4 (10.0 ov)', 50, 160);
  ctx.fillText('Guest XI: 121/2 (8.4 ov)', 50, 220);

  const outPath = path.join(__dirname, 'test_out.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log('Successfully wrote image to:', outPath);
}

main().catch(err => {
  console.error('Error in main:', err);
});
