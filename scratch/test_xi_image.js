const { createCanvas, loadImage } = require('@napi-rs/canvas');

const mockXi = [
  { name: 'Virat Kohli', ovr: 92, role: 'batsman', country: 'India', tier: 'Legendary', image_url: null },
  { name: 'Pat Cummins', ovr: 95, role: 'bowler', country: 'Australia', tier: 'Legendary', image_url: null },
  { name: 'Ben Stokes', ovr: 86, role: 'all_rounder', country: 'England', tier: 'Gold', image_url: null },
  { name: 'Rashid Khan', ovr: 94, role: 'bowler', country: 'Afghanistan', tier: 'Legendary', image_url: null },
  { name: 'Mujeeb Ur Rahman', ovr: 81, role: 'bowler', country: 'Afghanistan', tier: 'Gold', image_url: null },
  { name: 'Liton Das', ovr: 78, role: 'wicket_keeper', country: 'Bangladesh', tier: 'Silver', image_url: null },
  { name: 'J. Bumrah', ovr: 93, role: 'bowler', country: 'India', tier: 'Legendary', image_url: null },
  { name: 'Travis Head', ovr: 84, role: 'batsman', country: 'Australia', tier: 'Gold', image_url: null },
  { name: 'Heinrich Klaasen', ovr: 85, role: 'wicket_keeper', country: 'South Africa', tier: 'Gold', image_url: null },
  { name: 'Kagiso Rabada', ovr: 89, role: 'bowler', country: 'South Africa', tier: 'Gold', image_url: null },
  { name: 'Mitchell Santner', ovr: 81, role: 'bowler', country: 'New Zealand', tier: 'Silver', image_url: null },
];

function drawRoundRect(ctx, x, y, width, height, radius) {
  if (typeof radius === 'number') {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    const defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    radius = { ...defaultRadius, ...radius };
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
}

async function testRender() {
  const width = 1200;
  const height = 820;
  const canvas = createCanvas(width, height);
  const ctxCanvas = canvas.getContext('2d');

  console.log("Starting canvas rendering test with custom drawRoundRect...");

  // 1. Draw Background Gradient
  const bgGrad = ctxCanvas.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#0f1225');
  bgGrad.addColorStop(0.5, '#131131');
  bgGrad.addColorStop(1, '#060713');
  ctxCanvas.fillStyle = bgGrad;
  ctxCanvas.fillRect(0, 0, width, height);

  // 2. Draw Decorative Grid Pattern
  ctxCanvas.strokeStyle = 'rgba(124, 58, 237, 0.05)';
  ctxCanvas.lineWidth = 1;
  const gridSize = 60;
  for (let x = 0; x < width; x += gridSize) {
    ctxCanvas.beginPath();
    ctxCanvas.moveTo(x, 0);
    ctxCanvas.lineTo(x, height);
    ctxCanvas.stroke();
  }

  // Draw glowing stadium arch effect
  ctxCanvas.fillStyle = 'rgba(79, 70, 229, 0.08)';
  ctxCanvas.beginPath();
  ctxCanvas.arc(width / 2, height + 100, 500, Math.PI, 0);
  ctxCanvas.fill();

  // 3. Draw Header
  ctxCanvas.fillStyle = '#ffffff';
  ctxCanvas.font = 'bold 36px sans-serif';
  ctxCanvas.textAlign = 'center';
  ctxCanvas.fillText('PLAYING XI', width / 2, 65);

  const teamRating = 87;
  
  // Draw OVR badge on the right
  ctxCanvas.fillStyle = 'rgba(167, 139, 250, 0.15)';
  ctxCanvas.beginPath();
  ctxCanvas.arc(1080, 75, 45, 0, Math.PI * 2);
  ctxCanvas.fill();
  ctxCanvas.strokeStyle = '#a78bfa';
  ctxCanvas.lineWidth = 2;
  ctxCanvas.stroke();

  ctxCanvas.fillStyle = '#ffffff';
  ctxCanvas.font = 'bold 28px sans-serif';
  ctxCanvas.fillText(String(teamRating), 1080, 73);

  // Helper functions for colors and roles
  const getOvrColor = (ovr) => {
    if (ovr >= 90) return '#ff007f'; // Legendary pink
    if (ovr >= 80) return '#ffd700'; // Gold
    if (ovr >= 70) return '#82b1ff'; // Silver
    return '#cd7f32'; // Bronze
  };

  // 4. Render Grid of 11 Player Cards
  const cardWidth = 240;
  const cardHeight = 180;

  const positions = [];

  // Row 1 (y = 150)
  let marginRow1 = (width - (4 * cardWidth)) / 5;
  for (let i = 0; i < 4; i++) {
    positions.push({ x: marginRow1 + i * (cardWidth + marginRow1), y: 150 });
  }

  // Row 2 (y = 370)
  let marginRow2 = (width - (4 * cardWidth)) / 5;
  for (let i = 0; i < 4; i++) {
    positions.push({ x: marginRow2 + i * (cardWidth + marginRow2), y: 370 });
  }

  // Row 3 (y = 590) - centered 3 players
  let marginRow3 = (width - (3 * cardWidth)) / 4;
  for (let i = 0; i < 3; i++) {
    positions.push({ x: marginRow3 + i * (cardWidth + marginRow3), y: 590 });
  }

  for (let i = 0; i < 11; i++) {
    const p = mockXi[i];
    const pos = positions[i];
    const ovrColor = getOvrColor(p.ovr);

    console.log(`Rendering player card ${i}: ${p.name}`);

    // Draw glass card body
    ctxCanvas.save();
    drawRoundRect(ctxCanvas, pos.x, pos.y, cardWidth, cardHeight, 16);
    ctxCanvas.clip();

    const cardGrad = ctxCanvas.createLinearGradient(pos.x, pos.y, pos.x, pos.y + cardHeight);
    cardGrad.addColorStop(0, '#171c2f');
    cardGrad.addColorStop(1, '#0e111d');
    ctxCanvas.fillStyle = cardGrad;
    ctxCanvas.fill();

    ctxCanvas.strokeStyle = p.tier === 'Legendary' ? '#ff007f' : p.tier === 'Gold' ? '#ffd700' : 'rgba(255, 255, 255, 0.15)';
    ctxCanvas.lineWidth = p.tier === 'Legendary' || p.tier === 'Gold' ? 2 : 1;
    ctxCanvas.stroke();

    ctxCanvas.restore();

    // Draw OVR rating badge
    ctxCanvas.fillStyle = ovrColor;
    drawRoundRect(ctxCanvas, pos.x + 12, pos.y + 12, 64, 24, 6);
    ctxCanvas.fill();
  }

  console.log("Successfully completed custom drawRoundRect render test!");
}

testRender().catch(err => {
  console.error("FAILED TEST RENDER:", err);
});
