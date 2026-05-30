const { Bot, InlineKeyboard } = require('grammy');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);

// Let's mock a context
const ctxMock = {
  chat: { id: 7361215114, type: 'private' },
  from: { id: 7361215114, first_name: 'Aswath' },
  me: { username: 'Imposter0_bot' },
  reply: async (text, options) => {
    console.log("REPLY TEXT:", text);
    console.log("REPLY OPTIONS:", JSON.stringify(options, null, 2));
    return { message_id: 12345 };
  }
};

// Let's load the actual handlers from bot.js
// Wait, we can't easily export them since they are not exported, but we can simulate the execution
// by importing bot.js and triggering the update!
async function run() {
  console.log("Simulating /shop update...");
  await bot.api.sendMessage(7361215114, "Testing direct message via API").catch(console.error);
}

run().catch(console.error);
