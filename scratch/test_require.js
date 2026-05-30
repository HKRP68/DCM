try {
  const { bot } = require('../bot');
  console.log("SUCCESS: bot required without error!");
  process.exit(0);
} catch (e) {
  console.error("FAIL:", e);
  process.exit(1);
}
