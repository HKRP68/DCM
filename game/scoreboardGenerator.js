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
 * Extracts and sorts top performers for an innings.
 */
function extractInningsPerformers(match, inningsIdx) {
  const inn = match.innings[inningsIdx];
  if (!inn) return { batsmen: [], bowlers: [] };

  const battingId = inn.battingId ? inn.battingId.toString() : '';
  const bowlingId = inn.bowlingId ? inn.bowlingId.toString() : '';
  const hostId = match.host?.telegramId ? match.host.telegramId.toString() : '';
  const guestId = match.guest?.telegramId ? match.guest.telegramId.toString() : '';

  let battingXI = [];
  let bowlingXI = [];

  if (hostId && hostId === battingId) {
    battingXI = match.host.xi || [];
  } else if (guestId && guestId === battingId) {
    battingXI = match.guest.xi || [];
  }

  if (hostId && hostId === bowlingId) {
    bowlingXI = match.host.xi || [];
  } else if (guestId && guestId === bowlingId) {
    bowlingXI = match.guest.xi || [];
  }

  // Get batsmen stats
  const batsmen = battingXI
    .map(player => {
      const stats = match.stats[player.id] || { runs: 0, balls: 0 };
      return { name: player.name, runs: stats.runs || 0, balls: stats.balls || 0 };
    })
    .filter(p => p.balls > 0 || p.runs > 0)
    .sort((a, b) => b.runs - a.runs);

  // Get bowlers stats
  const bowlers = bowlingXI
    .map(player => {
      const stats = match.stats[player.id] || { wickets: 0, runsConceded: 0, overs: 0 };
      return {
        name: player.name,
        wickets: stats.wickets || 0,
        runsConceded: stats.runsConceded || 0,
        overs: stats.overs || 0
      };
    })
    .filter(p => p.overs > 0 || p.wickets > 0 || p.runsConceded > 0)
    .sort((a, b) => {
      if (b.wickets !== a.wickets) {
        return b.wickets - a.wickets;
      }
      return a.runsConceded - b.runsConceded;
    });

  return { batsmen, bowlers };
}

/**
 * Generates a TV broadcast-style PNG Buffer with match scorecard details.
 */
async function generateScoreboardImage(match, result, marginText) {
  try {
    const width = 1024;
    const height = 576;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Draw blurred stadium backdrop
    const bgPath = path.join(__dirname, '..', 'assets', 'stadium_bg.png');
    try {
      const bg = await loadImage(bgPath);
      ctx.drawImage(bg, 0, 0, width, height);
    } catch (err) {
      console.error("Failed to load stadium background, using color fallback:", err);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Centered glassmorphic card container
    const cardX = 112;
    const cardY = 38;
    const cardW = 800;
    const cardH = 500;

    const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    cardGrad.addColorStop(0, 'rgba(10, 15, 26, 0.90)');
    cardGrad.addColorStop(1, 'rgba(5, 7, 12, 0.95)');
    ctx.fillStyle = cardGrad;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    // Chrome/Silver gradient border
    const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    borderGrad.addColorStop(0, '#e2e8f0');
    borderGrad.addColorStop(0.3, '#94a3b8');
    borderGrad.addColorStop(0.5, '#ffffff');
    borderGrad.addColorStop(0.7, '#475569');
    borderGrad.addColorStop(1, '#cbd5e1');
    ctx.strokeStyle = borderGrad;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Resolve team names
    const hostId = match.host?.telegramId ? match.host.telegramId.toString() : '';
    const hostName = match.host?.teamName || match.host?.username || 'Host';
    const guestName = (match.guest && (match.guest.teamName || match.guest.username)) || (match.guest ? 'Guest' : 'AI Bot');

    const inn1 = match.innings[0];
    const inn2 = match.innings[1];
    const inn1BattingId = inn1?.battingId ? inn1.battingId.toString() : '';
    const inn2BattingId = inn2?.battingId ? inn2.battingId.toString() : '';
    const team1Name = ((hostId && inn1BattingId === hostId) ? hostName : guestName) || 'Unknown';
    const team2Name = ((hostId && inn2BattingId === hostId) ? hostName : guestName) || 'Unknown';

    // 3. Top Horizontal Metallic Bar (MATCH SUMMARY)
    const metalGrad = ctx.createLinearGradient(130, 55, 130, 97);
    metalGrad.addColorStop(0, '#f8fafc');
    metalGrad.addColorStop(0.4, '#e2e8f0');
    metalGrad.addColorStop(0.5, '#cbd5e1');
    metalGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = metalGrad;
    drawRoundedRect(ctx, 130, 55, 764, 42, 6);
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MATCH SUMMARY', 512, 84);

    // 4. Innings 1 Ribbon (Blue Gloss)
    const blueGrad = ctx.createLinearGradient(130, 107, 130, 143);
    blueGrad.addColorStop(0, '#1d4ed8');
    blueGrad.addColorStop(0.5, '#2563eb');
    blueGrad.addColorStop(1, '#1e3a8a');
    ctx.fillStyle = blueGrad;
    drawRoundedRect(ctx, 130, 107, 764, 36, 4);
    ctx.fill();

    // Innings 1 Info Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(team1Name.toUpperCase(), 145, 131);

    ctx.textAlign = 'right';
    ctx.fillText(`${result.inn1Overs} Overs  |  ${result.inn1Runs}/${result.inn1Wickets}`, 879, 131);

    // Innings 1 Table content
    const inn1Performers = extractInningsPerformers(match, 0);

    // Innings 1 Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(512, 150);
    ctx.lineTo(512, 265);
    ctx.stroke();

    // Draw Batsmen (Left column)
    for (let i = 0; i < 4; i++) {
      const y = 168 + i * 23;
      const p = inn1Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 145, y);

      if (p.runs !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(p.runs, 420, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`(${p.balls})`, 460, y);
      }
    }

    // Draw Bowlers (Right column)
    for (let i = 0; i < 4; i++) {
      const y = 168 + i * 23;
      const p = inn1Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', overs: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 545, y);

      if (p.wickets !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${p.wickets}-${p.runsConceded}`, 820, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${parseFloat(p.overs).toFixed(1)}`, 865, y);
      }
    }

    // 5. Innings 2 Ribbon (Green Gloss)
    const greenGrad = ctx.createLinearGradient(130, 275, 130, 311);
    greenGrad.addColorStop(0, '#047857');
    greenGrad.addColorStop(0.5, '#059669');
    greenGrad.addColorStop(1, '#064e3b');
    ctx.fillStyle = greenGrad;
    drawRoundedRect(ctx, 130, 275, 764, 36, 4);
    ctx.fill();

    // Innings 2 Info Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(team2Name.toUpperCase(), 145, 299);

    ctx.textAlign = 'right';
    ctx.fillText(`${result.inn2Overs} Overs  |  ${result.inn2Runs}/${result.inn2Wickets}`, 879, 299);

    // Innings 2 Table content
    const inn2Performers = extractInningsPerformers(match, 1);

    // Innings 2 Divider Line
    ctx.beginPath();
    ctx.moveTo(512, 318);
    ctx.lineTo(512, 433);
    ctx.stroke();

    // Draw Batsmen (Left column)
    for (let i = 0; i < 4; i++) {
      const y = 336 + i * 23;
      const p = inn2Performers.batsmen[i] || { name: '-', runs: '', balls: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 145, y);

      if (p.runs !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(p.runs, 420, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`(${p.balls})`, 460, y);
      }
    }

    // Draw Bowlers (Right column)
    for (let i = 0; i < 4; i++) {
      const y = 336 + i * 23;
      const p = inn2Performers.bowlers[i] || { name: '-', wickets: '', runsConceded: '', overs: '' };
      ctx.fillStyle = '#ffffff';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, 545, y);

      if (p.wickets !== '') {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${p.wickets}-${p.runsConceded}`, 820, y);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${parseFloat(p.overs).toFixed(1)}`, 865, y);
      }
    }

    // 6. Bottom Horizontal Metallic Bar (Winner Announcement)
    ctx.fillStyle = metalGrad;
    drawRoundedRect(ctx, 130, 443, 764, 42, 6);
    ctx.fill();
    ctx.stroke();

    let winnerLine = 'THE MATCH ENDED IN A TIE!';
    if (result.winner) {
      const winnerName = result.winner.teamName || result.winner.username;
      winnerLine = `${winnerName} ${marginText}`;
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(winnerLine.toUpperCase(), 512, 472);

    // 7. Broadcaster Channel Logo circular overlay (floating in corner)
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    try {
      const logo = await loadImage(logoPath);
      const circleX = 145;
      const circleY = 75;
      const radius = 30;

      // Outer chrome ring
      const ringGrad = ctx.createLinearGradient(circleX - radius, circleY - radius, circleX + radius, circleY + radius);
      ringGrad.addColorStop(0, '#f8fafc');
      ringGrad.addColorStop(0.5, '#94a3b8');
      ringGrad.addColorStop(1, '#475569');
      ctx.fillStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius + 2, 0, Math.PI * 2);
      ctx.fill();

      // Clip logo into circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, circleX - radius, circleY - radius, radius * 2, radius * 2);
      ctx.restore();
    } catch (err) {
      console.error("Failed to draw channel logo badge:", err);
    }

    return canvas.toBuffer('image/png');
  } catch (err) {
    console.error("Error generating TV scoreboard image:", err);
    return null;
  }
}

module.exports = {
  generateScoreboardImage
};
