const { Bot, InlineKeyboard } = require('grammy');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);

function addShopButton(kb, ctx, label = "🛒 Visit Player Shop", tab = "shop") {
  const isPrivate = ctx.chat?.type === 'private';
  const botUsername = ctx.me?.username || bot.botInfo?.username || 'Imposter0_bot';
  
  if (isPrivate) {
    const miniAppUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'undercover-bot.onrender.com'}/bonus-app?msg_id=0&chat_id=${ctx.chat.id}&tab=${tab}`;
    kb.webApp(label, miniAppUrl);
  } else {
    const directLink = `https://t.me/${botUsername}/bonus?startapp=${tab}`;
    kb.url(label, directLink);
  }
  return kb;
}

async function test() {
  const userId = 7361215114;
  const groupId = -1003906592838;
  
  // Test 1: Private chat context
  try {
    const ctxPrivate = {
      chat: { type: 'private', id: userId },
      me: { username: 'Imposter0_bot' }
    };
    const kb = addShopButton(new InlineKeyboard(), ctxPrivate);
    await bot.api.sendMessage(userId, "Test in DM (should be webApp)", { reply_markup: kb });
    console.log("SUCCESS: DM webApp button sent!");
  } catch (e) {
    console.error("FAILED in DM:", e.message);
  }

  // Test 2: Group chat context
  try {
    const ctxGroup = {
      chat: { type: 'supergroup', id: groupId },
      me: { username: 'Imposter0_bot' }
    };
    const kb = addShopButton(new InlineKeyboard(), ctxGroup);
    await bot.api.sendMessage(userId, "Test in Group (should be URL direct link)", { reply_markup: kb });
    console.log("SUCCESS: Group direct link button sent!");
  } catch (e) {
    console.error("FAILED in Group:", e.message);
  }
}

test().catch(console.error);
