const { bot } = require('./bot');

async function test() {
   const ADMIN_IDS = [7361215114];
   
   // We will mock ctx to see if the function executes without error
   const mockCtx = {
       from: { id: 7361215114 },
       reply: (text) => console.log("REPLY SUCCESS:\n", text)
   };
   
   // Extract the handler
   // Actually grammy bot does not expose this easily, let's just re-implement the handler locally 
   // or import Managers to check if any of them fail
   
   const sb = require('./db/supabase');
   const gameManager = require('./game/gameManager');
   const mafiaManager = require('./game/mafiaManager');
   const liesManager = require('./game/liesManager');
   const hiloManager = require('./game/hiloManager');
   
   const ucCount = gameManager.getActiveGamesCount();
   const mafCount = mafiaManager.getActiveGamesCount();
   const liesCount = liesManager.getActiveGamesCount();
   const hiloCount = hiloManager.getActiveGamesCount();
   const stats = await sb.getGlobalStats().catch(() => ({ totalUsers: "Error", totalGroups: "Error" }));
   
   const activity24h = new Map();
   activity24h.set(1, { name: "Test<Me>", cmds: 5 });
   const active24 = Array.from(activity24h.values());
   const activeUsers24Count = active24.length;
   active24.sort((a, b) => b.cmds - a.cmds);
   let topPlayersStr = "";
   for (let i = 0; i < Math.min(3, active24.length); i++) {
        const safeName = (active24[i].name || 'Unknown').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        topPlayersStr += `  ${i+1}. ${safeName} (${active24[i].cmds} interactions)\n`;
   }
   if (!topPlayersStr) topPlayersStr = "  None yet\n";

   const text = `📊 <b>Admin Activity Dashboard</b>\n\n` +
                `👥 <b>Total Users (DB):</b> ${stats.totalUsers}\n` +
                `🏘️ <b>Total Groups (DB):</b> ${stats.totalGroups}\n\n` +
                `🔥 <b>24-Hour Activity:</b>\n` +
                `  Active Players: ${activeUsers24Count}\n` +
                `  <b>Most Active:</b>\n${topPlayersStr}\n` +
                `🎮 <b>Live Games:</b>\n` +
                `- Undercover: ${ucCount}\n` +
                `- Mafia: ${mafCount}\n` +
                `- Lies: ${liesCount}\n` +
                `- Hilo: ${hiloCount}\n\n` +
                `⏳ <i>Cleanup interval: 30m</i>`;
                
   console.log("TEXT BUILT SUCCESSFULLY:\n", text);
}

test().catch(console.error);
