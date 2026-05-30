const { Bot } = require('grammy');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);

async function run() {
  const me = await bot.api.getMe();
  console.log("ACTUAL BOT INFO:", JSON.stringify(me, null, 2));
}

run().catch(console.error);
