function getRandomReward() {
  const rand = Math.random() * 100;
  if (rand < 70) return Math.floor(Math.random() * (600 - 300 + 1)) + 300; // 300 - 600 (70%)
  if (rand < 90) return Math.floor(Math.random() * (1500 - 601 + 1)) + 601; // 601 - 1500 (20%)
  if (rand < 98) return Math.floor(Math.random() * (3000 - 1501 + 1)) + 1501; // 1501 - 3000 (8%)
  return Math.floor(Math.random() * (5000 - 3001 + 1)) + 3001; // 3001 - 5000 (2%)
}

const stats = { common: 0, uncommon: 0, rare: 0, jackpot: 0 };
const iterations = 10000;

for (let i = 0; i < iterations; i++) {
  const r = getRandomReward();
  if (r <= 600) stats.common++;
  else if (r <= 1500) stats.uncommon++;
  else if (r <= 3000) stats.rare++;
  else stats.jackpot++;
}

console.log("Stats after", iterations, "runs:");
console.log(JSON.stringify(stats, null, 2));
