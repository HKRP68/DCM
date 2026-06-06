try {
  const espncricinfo = require('espncricinfo');
  console.log("espncricinfo keys:", Object.keys(espncricinfo));
} catch (err) {
  console.log("espncricinfo error:", err.message);
}

try {
  const cricPlayerInfo = require('cric-player-info');
  console.log("cric-player-info keys:", Object.keys(cricPlayerInfo));
  if (typeof cricPlayerInfo === 'function') {
    console.log("cric-player-info is a function");
  }
} catch (err) {
  console.log("cric-player-info error:", err.message);
}
