require('dotenv').config();
const { Bot } = require('grammy');
const sb = require('../db/supabase');

const bot = new Bot(process.env.BOT_TOKEN);

async function run() {
  if (!sb.supabase) {
    console.error("Supabase client not initialized.");
    return;
  }

  // 1. Fetch profiles where name is 'cricket'
  const { data: profiles, error } = await sb.supabase
    .from('profiles')
    .select('user_id, first_name')
    .eq('first_name', 'cricket');

  if (error) {
    console.error("Error fetching profiles:", error);
    return;
  }

  console.log(`Found ${profiles.length} profiles with name 'cricket'`);

  for (const p of profiles) {
    console.log(`Processing user ID: ${p.user_id}...`);
    try {
      const chat = await bot.api.getChat(p.user_id);
      const realName = chat.first_name || chat.username || 'Player';
      console.log(`Resolved ID ${p.user_id} to name "${realName}"`);
      
      const { error: updateError } = await sb.supabase
        .from('profiles')
        .update({ first_name: realName })
        .eq('user_id', p.user_id);

      if (updateError) {
        console.error(`Failed to update DB for ${p.user_id}:`, updateError);
      } else {
        console.log(`Successfully updated ${p.user_id} to "${realName}"`);
      }
    } catch (err) {
      console.error(`Failed to resolve chat info for ${p.user_id}:`, err.message);
    }
  }

  // 2. Fetch group_stats where name is 'cricket'
  const { data: stats, error: statsError } = await sb.supabase
    .from('group_stats')
    .select('user_id, chat_id, first_name')
    .eq('first_name', 'cricket');

  if (statsError) {
    console.error("Error fetching group stats:", statsError);
  } else if (stats && stats.length > 0) {
    console.log(`Found ${stats.length} group_stats with name 'cricket'`);
    for (const s of stats) {
      console.log(`Processing group stat for user ID: ${s.user_id}...`);
      try {
        const chat = await bot.api.getChat(s.user_id);
        const realName = chat.first_name || chat.username || 'Player';
        
        await sb.supabase
          .from('group_stats')
          .update({ first_name: realName })
          .eq('user_id', s.user_id)
          .eq('chat_id', s.chat_id);

        console.log(`Successfully updated group stat for ${s.user_id} to "${realName}"`);
      } catch (err) {
        console.error(`Failed to resolve chat info for group stat user ${s.user_id}:`, err.message);
      }
    }
  }

  console.log("Migration complete!");
}

run();
