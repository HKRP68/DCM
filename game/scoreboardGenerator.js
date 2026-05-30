const path = require('path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Rounded rectangle helper
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Generates a PNG Buffer with match scorecard details.
 * @param {Object} match The match instance.
 * @param {Object} result The finalized match result data.
 * @param {String} marginText Sentence describing the win margin.
 * @returns {Promise<Buffer|null>}
 */
async function generateScoreboardImage(match, result, marginText) {
  try {
    const width = 800;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Dark background with subtle linear gradient (detective fire vibes)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0c0e14');
    bgGrad.addColorStop(0.5, '#1b1114'); // subtle dark red glow
    bgGrad.addColorStop(1, '#08090d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Crimson outer border
    ctx.strokeStyle = '#e50914';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // 3. Resolve Team Names
    const hostId = match.host.telegramId.toString();
    const inn1 = match.innings[0];
    const inn2 = match.innings[1];

    const hostName = match.host.teamName || match.host.username || 'Host';
    const guestName = match.guest ? (match.guest.teamName || match.guest.username) : 'AI Bot';

    const team1Name = inn1.battingId.toString() === hostId ? hostName : guestName;
    const team2Name = inn2.battingId.toString() === hostId ? hostName : guestName;

    // 4. Header Bar
    ctx.fillStyle = '#e50914';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('🏆 CRICKIDEX MATCH COMPLETED', 50, 60);

    // Winner line
    let winnerLine = 'The match ended in a tie!';
    if (result.winner) {
      const winnerName = result.winner.teamName || result.winner.username;
      winnerLine = `🎉 ${winnerName} ${marginText}!`;
    }
    ctx.fillStyle = '#ffd700'; // Gold color
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(winnerLine, 50, 95);

    // 5. Draw Innings details (Left Side)
    const cardWidth = 430;
    
    // Innings 1 Card
    ctx.fillStyle = 'rgba(25, 30, 48, 0.65)';
    drawRoundedRect(ctx, 50, 120, cardWidth, 100, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(229, 9, 20, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.fillText('1ST INNINGS', 70, 145);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(team1Name, 70, 175);

    ctx.fillStyle = '#38bdf8'; // bright sky blue score
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${result.inn1Runs}/${result.inn1Wickets} (${result.inn1Overs} ov)`, 70, 205);

    // Innings 2 Card
    ctx.fillStyle = 'rgba(25, 30, 48, 0.65)';
    drawRoundedRect(ctx, 50, 240, cardWidth, 100, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px sans-serif';
    ctx.fillText('2ND INNINGS', 70, 265);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(team2Name, 70, 295);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`${result.inn2Runs}/${result.inn2Wickets} (${result.inn2Overs} ov)`, 70, 325);

    // 6. Draw Player of the Match Card at bottom
    if (result.motm) {
      ctx.fillStyle = 'rgba(229, 9, 20, 0.1)';
      drawRoundedRect(ctx, 50, 360, cardWidth, 90, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(229, 9, 20, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffd700'; // Gold
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('🏅 PLAYER OF THE MATCH', 70, 385);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(result.motm.name, 70, 410);

      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      let statsText = `${result.motm.runs} runs (${result.motm.balls}b)`;
      if (result.motm.wickets > 0) {
        statsText += ` & ${result.motm.wickets} wkts (${result.motm.overs} ov)`;
      }
      ctx.fillText(statsText, 70, 435);
    }

    // 7. Load and Draw Logo (Right Side)
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    try {
      const logo = await loadImage(logoPath);
      // Soft glow backing logo
      const glowGrad = ctx.createRadialGradient(640, 240, 10, 640, 240, 160);
      glowGrad.addColorStop(0, 'rgba(229, 9, 20, 0.15)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(640, 240, 160, 0, Math.PI * 2);
      ctx.fill();

      // Draw Logo
      ctx.drawImage(logo, 520, 120, 240, 240);
    } catch (err) {
      console.error("Failed to load logo in scoreboard image:", err);
    }

    // Return the Buffer
    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error("Error generating scoreboard image:", err);
    return null;
  }
}

module.exports = {
  generateScoreboardImage
};
