const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log("Supabase Client Initialized");
} else {
  console.log("WARNING: Supabase URL or Key missing. Database features will be bypassed.");
}

// --- Player Caching System ---
let cachedCricketPlayers = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// --- Mutex Lock System ---
const coinLocks = new Map();

async function acquireLock(userId) {
  if (!coinLocks.has(userId)) {
    coinLocks.set(userId, Promise.resolve());
  }
  const prev = coinLocks.get(userId);
  let release;
  const next = new Promise(resolve => {
    release = resolve;
  });
  coinLocks.set(userId, next);
  await prev;
  return release;
}

function releaseLock(releaseFn) {
  if (typeof releaseFn === 'function') releaseFn();
}

// --- Internal Coin Logic (No Locks) ---

async function addCoinsInternal(userId, amount) {
  let { data: profile } = await supabase.from('profiles').select('coins').eq('user_id', userId).single();
  if (profile) {
    if (amount < 0 && (profile.coins || 0) < Math.abs(amount)) return false;
    const newCoins = (profile.coins || 0) + amount;
    if (amount >= 1000) console.log(`[COINS] Adding ${amount} to ${userId}. New balance: ${newCoins}`);
    await supabase.from('profiles').update({ coins: newCoins }).eq('user_id', userId);
    return newCoins;
  }
  return 0;
}

async function transferCoinsInternal(senderId, receiverId, amount) {
  const { data: sender } = await supabase.from('profiles').select('coins').eq('user_id', senderId).single();
  if (!sender || (sender.coins || 0) < amount) {
      return { success: false, error: `Insufficient coins! Balance: ${sender?.coins || 0}` };
  }
  
  const { data: receiver } = await supabase.from('profiles').select('coins').eq('user_id', receiverId).single();
  if (!receiver) return { success: false, error: 'Receiver not found' };
  
  await supabase.from('profiles').update({ coins: sender.coins - amount }).eq('user_id', senderId);
  await supabase.from('profiles').update({ coins: (receiver.coins || 0) + amount }).eq('user_id', receiverId);
  
  return { success: true, senderBalance: sender.coins - amount, receiverBalance: (receiver.coins || 0) + amount };
}

// --- Public API (With Locks) ---

async function recordWin(userId, firstName, chatId) {
  if (!supabase) return;
  const release = await acquireLock(userId);
  try {
    let { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    const finalName = (firstName && firstName !== 'cricket') ? firstName : (profile?.first_name || 'User');
    if (profile) {
      const newCoins = (profile.coins || 0) + 200;
      await supabase.from('profiles').update({ 
          wins: profile.wins + 1, 
          matches_played: profile.matches_played + 1, 
          first_name: finalName, 
          coins: newCoins 
      }).eq('user_id', userId);
    } else {
      await supabase.from('profiles').insert({ user_id: userId, first_name: finalName, wins: 1, matches_played: 1, coins: 2200 });
    }
    // No lock needed for group stats (no coins)
    await updateGroupStat(userId, chatId, finalName, true);
  } finally {
    releaseLock(release);
  }
}

async function recordLoss(userId, firstName, chatId) {
  if (!supabase) return;
  const release = await acquireLock(userId);
  try {
    let { data: profile } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
    const finalName = (firstName && firstName !== 'cricket') ? firstName : (profile?.first_name || 'User');
    if (profile) {
      await supabase.from('profiles').update({ matches_played: profile.matches_played + 1, first_name: finalName }).eq('user_id', userId);
    } else {
      await supabase.from('profiles').insert({ user_id: userId, first_name: finalName, wins: 0, matches_played: 1, coins: 2000 });
    }
    await updateGroupStat(userId, chatId, finalName, false);
  } finally {
    releaseLock(release);
  }
}

async function updateGroupStat(userId, chatId, firstName, isWin) {
  let { data: gstat } = await supabase.from('group_stats').select('*').eq('user_id', userId).eq('chat_id', chatId).single();
  const finalName = (firstName && firstName !== 'cricket') ? firstName : (gstat?.first_name || 'User');
  if (gstat) {
    await supabase.from('group_stats').update({ 
        wins: gstat.wins + (isWin ? 1 : 0), 
        matches_played: gstat.matches_played + 1, 
        first_name: finalName 
    }).eq('user_id', userId).eq('chat_id', chatId);
  } else {
    await supabase.from('group_stats').insert({ user_id: userId, chat_id: chatId, first_name: finalName, wins: isWin ? 1 : 0, matches_played: 1 });
  }
}

async function addCoins(userId, amount) {
  if (!supabase) return 0;
  const release = await acquireLock(userId);
  try {
      return await addCoinsInternal(userId, amount);
  } finally {
      releaseLock(release);
  }
}

async function transferCoins(senderId, receiverId, amount) {
  if (!supabase || amount <= 0) return { success: false, error: 'Invalid transfer' };
  const [firstId, secondId] = senderId < receiverId ? [senderId, receiverId] : [receiverId, senderId];
  const release1 = await acquireLock(firstId);
  const release2 = await acquireLock(secondId);
  try {
      return await transferCoinsInternal(senderId, receiverId, amount);
  } finally {
      releaseLock(release1);
      releaseLock(release2);
  }
}

async function getProfile(userId) {
  if (!supabase) return null;
  const { data } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
  return data;
}

const leaderboardCache = new Map();

async function getGlobalLeaderboard(sortBy = 'wins') {
  if (!supabase) return [];
  
  const now = Date.now();
  if (leaderboardCache.has(sortBy)) {
    const cached = leaderboardCache.get(sortBy);
    if (now - cached.timestamp < 30000) {
      return cached.data;
    }
  }

  let result = [];
  let query = supabase.from('profiles').select('*');
  if (sortBy === 'rating') {
    query = query.order('rating', { ascending: false })
                 .order('wins', { ascending: false })
                 .order('coins', { ascending: false });
  } else if (sortBy === 'wins') {
    query = query.order('wins', { ascending: false })
                 .order('rating', { ascending: false })
                 .order('coins', { ascending: false });
  } else {
    query = query.order(sortBy, { ascending: false })
                 .order('wins', { ascending: false })
                 .order('rating', { ascending: false });
  }
  const { data } = await query.limit(10);
  result = data || [];

  leaderboardCache.set(sortBy, { timestamp: now, data: result });
  return result;
}

async function getGroupLeaderboard(chatId, sortBy = 'wins') {
  if (!supabase) return [];
  if (sortBy === 'wins') {
    const { data } = await supabase.from('group_stats').select('*').eq('chat_id', chatId).order('wins', { ascending: false }).limit(10);
    return data;
  } else if (sortBy === 'coins' || sortBy === 'rating') {
    const { data: participants } = await supabase.from('group_stats').select('user_id').eq('chat_id', chatId);
    if (!participants || participants.length === 0) return [];
    const userIds = participants.map(p => p.user_id);
    
    let query = supabase.from('profiles').select('*').in('user_id', userIds);
    if (sortBy === 'coins') {
      query = query.order('coins', { ascending: false })
                   .order('wins', { ascending: false })
                   .order('rating', { ascending: false });
    } else {
      query = query.order('rating', { ascending: false })
                   .order('wins', { ascending: false })
                   .order('coins', { ascending: false });
    }
    const { data: profiles } = await query.limit(10);
    return profiles || [];
  }
  return [];
}

async function getUserGlobalRank(userId, sortBy = 'wins') {
  if (!supabase) return null;
  const profile = await getProfile(userId);
  if (!profile) return null;
  
  const val = profile[sortBy] || 0;
  
  if (sortBy === 'rating') {
    const { count: higherRating } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).gt('rating', val);
    const { count: sameRatingMoreWins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('rating', val).gt('wins', profile.wins || 0);
    const { count: sameRatingSameWinsMoreCoins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('rating', val).eq('wins', profile.wins || 0).gt('coins', profile.coins || 0);
    
    return (higherRating || 0) + (sameRatingMoreWins || 0) + (sameRatingSameWinsMoreCoins || 0) + 1;
  }
  
  if (sortBy === 'wins') {
    const { count: higherWins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).gt('wins', val);
    const { count: sameWinsMoreRating } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('wins', val).gt('rating', profile.rating || 0);
    const { count: sameWinsSameRatingMoreCoins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('wins', val).eq('rating', profile.rating || 0).gt('coins', profile.coins || 0);
    
    return (higherWins || 0) + (sameWinsMoreRating || 0) + (sameWinsSameRatingMoreCoins || 0) + 1;
  }
  
  if (sortBy === 'coins') {
    const { count: higherCoins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).gt('coins', val);
    const { count: sameCoinsMoreWins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('coins', val).gt('wins', profile.wins || 0);
    const { count: sameCoinsSameWinsMoreRating } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('coins', val).eq('wins', profile.wins || 0).gt('rating', profile.rating || 0);
    
    return (higherCoins || 0) + (sameCoinsMoreWins || 0) + (sameCoinsSameWinsMoreRating || 0) + 1;
  }

  const { count } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).gt(sortBy, val);
  return (count !== null ? count : 0) + 1;
}

async function getUserGroupRank(chatId, userId, sortBy = 'wins') {
  if (!supabase) return null;
  
  if (sortBy === 'wins') {
    const { data: gstat } = await supabase.from('group_stats').select('wins').eq('user_id', userId).eq('chat_id', chatId).single();
    if (!gstat) return null;
    const { count } = await supabase.from('group_stats').select('user_id', { count: 'exact', head: true }).eq('chat_id', chatId).gt('wins', gstat.wins);
    return (count !== null ? count : 0) + 1;
  }
  
  const profile = await getProfile(userId);
  if (!profile) return null;
  const { data: participants } = await supabase.from('group_stats').select('user_id').eq('chat_id', chatId);
  if (!participants || participants.length === 0) return null;
  const userIds = participants.map(p => p.user_id);
  
  if (sortBy === 'coins') {
    const { count: higherCoins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).gt('coins', profile.coins || 0);
    const { count: sameCoinsMoreWins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).eq('coins', profile.coins || 0).gt('wins', profile.wins || 0);
    const { count: sameCoinsSameWinsMoreRating } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).eq('coins', profile.coins || 0).eq('wins', profile.wins || 0).gt('rating', profile.rating || 0);
    return (higherCoins || 0) + (sameCoinsMoreWins || 0) + (sameCoinsSameWinsMoreRating || 0) + 1;
  }
  
  if (sortBy === 'rating') {
    const { count: higherRating } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).gt('rating', profile.rating || 0);
    const { count: sameRatingMoreWins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).eq('rating', profile.rating || 0).gt('wins', profile.wins || 0);
    const { count: sameRatingSameWinsMoreCoins } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).in('user_id', userIds).eq('rating', profile.rating || 0).eq('wins', profile.wins || 0).gt('coins', profile.coins || 0);
    return (higherRating || 0) + (sameRatingMoreWins || 0) + (sameRatingSameWinsMoreCoins || 0) + 1;
  }
  
  return null;
}

async function getGlobalStats() {
  if (!supabase) return { totalUsers: 0, totalGroups: 0, totalBonusClaims: 0, uniqueBonusClaimers: 0, completedCricketMatches: 0, activeCricketMatches: 0 };
  
  const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const { data: groupData } = await supabase.from('group_stats').select('chat_id');
  const uniqueGroups = new Set((groupData || []).map(g => g.chat_id)).size;

  // Fetch Bonus Stats
  const { count: totalBonusClaims } = await supabase.from('bonus_claims').select('*', { count: 'exact', head: true });
  const { data: bonusData } = await supabase.from('bonus_claims').select('user_id');
  const uniqueBonusClaimers = new Set((bonusData || []).map(b => b.user_id)).size;

  // Fetch Cricket Match Stats
  const { count: completedCricket } = await supabase
    .from('cricket_matches')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: activeCricket } = await supabase
    .from('cricket_matches')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'completed');

  return { 
    totalUsers: userCount || 0, 
    totalGroups: uniqueGroups,
    totalBonusClaims: totalBonusClaims || 0,
    uniqueBonusClaimers: uniqueBonusClaimers || 0,
    completedCricketMatches: completedCricket || 0,
    activeCricketMatches: activeCricket || 0
  };
}

async function recordBonusClaim(userId) {
  if (!supabase) return;
  const { error } = await supabase.from('bonus_claims').insert({ user_id: userId });
  if (error) console.error("Error recording bonus claim:", error);
}

// --- Group Settings ---

const DEFAULT_SETTINGS = {
  discussion_time: 90,
  voting_time: 60,
  impostor_guess_time: 30,
  clue_words: 1,
  anonymous_voting: false
};

const settingsCache = new Map();

async function getGroupSettings(chatId) {
  if (settingsCache.has(chatId)) return settingsCache.get(chatId);
  if (!supabase) return { ...DEFAULT_SETTINGS };
  const { data } = await supabase.from('group_settings').select('*').eq('chat_id', chatId).single();
  if (data) {
    const settings = {
      discussion_time: data.discussion_time ?? DEFAULT_SETTINGS.discussion_time,
      voting_time: data.voting_time ?? DEFAULT_SETTINGS.voting_time,
      impostor_guess_time: data.impostor_guess_time ?? DEFAULT_SETTINGS.impostor_guess_time,
      clue_words: data.clue_words ?? DEFAULT_SETTINGS.clue_words,
      anonymous_voting: data.anonymous_voting ?? DEFAULT_SETTINGS.anonymous_voting
    };
    settingsCache.set(chatId, settings);
    return settings;
  }
  const defaults = { ...DEFAULT_SETTINGS };
  try { await supabase.from('group_settings').insert({ chat_id: chatId, ...defaults }); } catch (e) {}
  settingsCache.set(chatId, defaults);
  return defaults;
}

async function updateGroupSetting(chatId, key, value) {
  const settings = await getGroupSettings(chatId);
  settings[key] = value;
  settingsCache.set(chatId, settings);
  if (!supabase) return settings;
  const { data: existing } = await supabase.from('group_settings').select('chat_id').eq('chat_id', chatId).single();
  if (existing) {
    await supabase.from('group_settings').update({ [key]: value }).eq('chat_id', chatId);
  } else {
    await supabase.from('group_settings').insert({ chat_id: chatId, [key]: value });
  }
  return settings;
}

async function getAllGroupIds() {
  if (!supabase) return [];
  const { data } = await supabase.from('group_settings').select('chat_id');
  return [...new Set((data || []).map(g => g.chat_id))];
}

async function getAllUserIds() {
  if (!supabase) return [];
  const { data } = await supabase.from('profiles').select('user_id');
  return (data || []).map(u => u.user_id);
}

const userCache = new Set();
async function ensureUser(userId, firstName) {
  if (!supabase || !userId) return;
  if (userCache.has(userId)) return;

  const release = await acquireLock(userId);
  try {
    const { data: profile } = await supabase.from('profiles').select('first_name').eq('user_id', userId).single();
    if (!profile) {
      await supabase.from('profiles').insert({ user_id: userId, first_name: firstName || 'User', wins: 0, matches_played: 0, coins: 2000 });
    } else if (firstName && (profile.first_name === 'Challenged Player' || profile.first_name === 'Targeted Player' || profile.first_name === 'User' || profile.first_name !== firstName)) {
        // Update name if it's one of the placeholders or if it has changed
        await supabase.from('profiles').update({ first_name: firstName }).eq('user_id', userId);
    }
    userCache.add(userId);
  } catch (e) {
    console.error("ensureUser error:", e);
  } finally {
    releaseLock(release);
  }
}

// --- Hilo Persistence ---
async function saveHiloGame(state) {
  if (!supabase) return;
  const { error } = await supabase.from('hilo_games').upsert({
    user_id: state.userId,
    bet_amount: state.betAmount,
    multiplier: state.multiplier,
    current_player: state.currentPlayer,
    next_player: state.nextPlayer,
    constraint_name: state.constraint,
    seen_players: state.seenPlayers,
    message_id: state.messageId,
    chat_id: state.chatId
  });
  if (error) console.error("Error saving Hilo game:", error);
}

async function getHiloGame(userId) {
  if (!supabase) return null;
  const { data, error } = await supabase.from('hilo_games').select('*').eq('user_id', userId).single();
  if (error || !data) return null;
  return {
    userId: data.user_id,
    betAmount: data.bet_amount,
    multiplier: data.multiplier,
    currentPlayer: data.current_player,
    nextPlayer: data.next_player,
    constraint: data.constraint_name,
    seenPlayers: data.seen_players,
    messageId: data.message_id,
    chatId: data.chat_id
  };
}

async function deleteHiloGame(userId) {
  if (!supabase) return;
  await supabase.from('hilo_games').delete().eq('user_id', userId);
}

async function cleanupStaleHiloGames() {
  if (!supabase) return;
  // Cleanup games older than 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('hilo_games').delete().lt('created_at', yesterday);
}

async function claimDaily(userId, amount) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  const release = await acquireLock(userId);
  try {
    const { data: profile } = await supabase.from('profiles').select('coins, last_daily').eq('user_id', userId).single();
    if (!profile) return { success: false, error: 'User not found. Please use /start first.' };

    const now = Date.now();
    const lastDaily = profile.last_daily ? new Date(profile.last_daily).getTime() : 0;
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - lastDaily < cooldown) {
      const remaining = cooldown - (now - lastDaily);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      return { success: false, remaining: `${hours}h ${minutes}m` };
    }

    const newCoins = (profile.coins || 0) + amount;
    await supabase.from('profiles').update({ 
      coins: newCoins, 
      last_daily: new Date().toISOString() 
    }).eq('user_id', userId);

    return { success: true, amount, newBalance: newCoins };
  } finally {
    releaseLock(release);
  }
}

async function claimGroupInviteReward(userId, chatId, amount) {
  if (!supabase) return { success: false };
  
  // 1. Check if this group was already rewarded
  const { data: existing } = await supabase.from('group_rewards').select('chat_id').eq('chat_id', chatId).single();
  if (existing) return { success: false, error: 'ALREADY_REWARDED' };

  const release = await acquireLock(userId);
  try {
    // 2. Record the reward to prevent double claiming
    const { error: recordError } = await supabase.from('group_rewards').insert({ 
      chat_id: chatId, 
      user_id: userId, 
      amount: amount 
    });
    
    if (recordError) return { success: false, error: 'DB_ERROR' };

    // 3. Add coins to the user
    const newBalance = await addCoinsInternal(userId, amount);
    return { success: true, amount, newBalance };
  } finally {
    releaseLock(release);
  }
}

async function checkAndClaimFreeSpin(userId) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  const release = await acquireLock(userId);
  try {
    const { data: profile } = await supabase.from('profiles').select('last_spin').eq('user_id', userId).single();
    if (!profile) return { success: false, error: 'User not found.' };

    const now = Date.now();
    const lastSpin = profile.last_spin ? new Date(profile.last_spin).getTime() : 0;
    const cooldown = 24 * 60 * 60 * 1000;

    if (now - lastSpin < cooldown) {
      return { success: false, lastSpin: lastSpin };
    }

    const { error } = await supabase.from('profiles').update({ 
      last_spin: new Date().toISOString() 
    }).eq('user_id', userId);
    
    if (error) return { success: false, error: 'DB_ERROR' };

    return { success: true };
  } catch(e) {
    return { success: false, error: 'DB_ERROR' };
  } finally {
    releaseLock(release);
  }
}

async function checkJackpotClaimed(userId, jackpotPlayerId) {
  if (!supabase) return false;
  try {
    const { data } = await supabase.from('user_owned_players')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', `jackpot_claimed_${jackpotPlayerId}`)
      .eq('sport', 'jackpot')
      .maybeSingle();
    return !!data;
  } catch (e) {
    console.error("checkJackpotClaimed error:", e);
    return false;
  }
}

async function recordJackpotClaim(userId, jackpotPlayerId) {
  if (!supabase) return;
  try {
    await supabase.from('user_owned_players').insert({
      user_id: userId,
      player_id: `jackpot_claimed_${jackpotPlayerId}`,
      sport: 'jackpot'
    });
  } catch (e) {
    console.error("recordJackpotClaim error:", e);
  }
}

async function checkIsModerator(userId) {
  if (!supabase) return false;
  try {
    const { data } = await supabase.from('user_owned_players')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', 'moderator')
      .eq('sport', 'moderator')
      .maybeSingle();
    return !!data;
  } catch (e) {
    console.error("checkIsModerator error:", e);
    return false;
  }
}

async function addModerator(userId) {
  if (!supabase) return false;
  try {
    const isAlreadyMod = await checkIsModerator(userId);
    if (isAlreadyMod) return true;
    const { error } = await supabase.from('user_owned_players').insert({
      user_id: userId,
      player_id: 'moderator',
      sport: 'moderator'
    });
    return !error;
  } catch (e) {
    console.error("addModerator error:", e);
    return false;
  }
}

async function getUserOwnedPlayers(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('user_owned_players')
      .select('player_id, sport, acquired_at')
      .eq('user_id', userId)
      .neq('sport', 'jackpot');
    if (error) {
      console.error("Error fetching owned players:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("Failed to get user owned players:", e);
    return [];
  }
}

async function getCricketPlayers() {
  if (!supabase) return [];
  const now = Date.now();
  if (cachedCricketPlayers && (now - lastCacheTime < CACHE_DURATION)) {
    return cachedCricketPlayers;
  }
  try {
    let allPlayers = [];
    let from = 0;
    const limit = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('cricketplayers')
        .select('*')
        .range(from, from + limit - 1);
      if (error) {
        console.error("Error fetching cricket players range:", error);
        break;
      }
      if (!data || data.length === 0) break;
      allPlayers.push(...data);
      if (data.length < limit) break;
      from += limit;
    }
    cachedCricketPlayers = allPlayers;
    lastCacheTime = now;
    return allPlayers;
  } catch (e) {
    console.error("Failed to get cricket players:", e);
    return [];
  }
}

async function buyPlayer(userId, playerId, sport, price) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  const release = await acquireLock(userId);
  try {
    // Check if player is already owned
    const { data: existing } = await supabase.from('user_owned_players')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .eq('sport', sport)
      .maybeSingle();

    if (existing) {
      return { success: false, error: 'You already own this player!' };
    }

    // For cricket: enforce 25 player squad cap and assign squad_order
    if (sport === 'cricket') {
      const { data: cricketOwned } = await supabase.from('user_owned_players')
        .select('squad_order')
        .eq('user_id', userId).eq('sport', 'cricket');
      if (cricketOwned && cricketOwned.length >= 25) {
        return { success: false, error: 'Your cricket squad is full (max 25 players)! Sell a player first.' };
      }
    }

    // Check coins balance
    const { data: profile } = await supabase.from('profiles').select('coins').eq('user_id', userId).single();
    if (!profile) return { success: false, error: 'User profile not found.' };

    const currentCoins = profile.coins || 0;
    if (currentCoins < price) {
      return { success: false, error: `Insufficient coins! You need ${price.toLocaleString()} coins.` };
    }

    // Determine next squad_order for cricket
    let nextOrder = 0;
    if (sport === 'cricket') {
      const { data: maxRow } = await supabase.from('user_owned_players')
        .select('squad_order')
        .eq('user_id', userId).eq('sport', 'cricket')
        .order('squad_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      nextOrder = (maxRow ? maxRow.squad_order : 0) + 1;
    }

    // Insert into user_owned_players
    const { error: insertError } = await supabase.from('user_owned_players').insert({
      user_id: userId,
      player_id: playerId,
      sport: sport,
      squad_order: nextOrder
    });

    if (insertError) {
      console.error("Insert owned player error:", insertError);
      return { success: false, error: 'Failed to record purchase.' };
    }

    // Deduct coins
    const newCoins = currentCoins - price;
    await supabase.from('profiles').update({ coins: newCoins }).eq('user_id', userId);

    await updateUserRating(userId);

    return { success: true, newBalance: newCoins };
  } catch (e) {
    console.error("Purchase player transaction failed:", e);
    return { success: false, error: 'Purchase failed due to database error.' };
  } finally {
    releaseLock(release);
  }
}

async function sellPlayer(userId, playerId, sport, sellPrice) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  const release = await acquireLock(userId);
  try {
    // Check if player is owned
    const { data: existing, error: findError } = await supabase.from('user_owned_players')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .eq('sport', sport)
      .maybeSingle();

    if (findError || !existing) {
      return { success: false, error: "You do not own this player!" };
    }

    // Delete from user_owned_players
    const { error: deleteError } = await supabase.from('user_owned_players')
      .delete()
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .eq('sport', sport);

    if (deleteError) {
      console.error("Delete owned player error:", deleteError);
      return { success: false, error: 'Failed to sell player.' };
    }

    // Get current coins balance
    const { data: profile } = await supabase.from('profiles').select('coins').eq('user_id', userId).single();
    if (!profile) return { success: false, error: 'User profile not found.' };

    const newCoins = (profile.coins || 0) + sellPrice;
    await supabase.from('profiles').update({ coins: newCoins }).eq('user_id', userId);

    await updateUserRating(userId);

    return { success: true, newBalance: newCoins };
  } catch (e) {
    console.error("Sell player transaction failed:", e);
    return { success: false, error: 'Sell failed due to database error.' };
  } finally {
    releaseLock(release);
  }
}

async function awardPlayer(userId, playerId, sport) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  const release = await acquireLock(userId);
  try {
    const { data: existing } = await supabase.from('user_owned_players')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .eq('sport', sport)
      .maybeSingle();

    if (existing) {
      return { success: true, alreadyOwned: true };
    }

    // Determine next squad_order for cricket
    let nextOrder = 0;
    if (sport === 'cricket') {
      const { data: maxRow } = await supabase.from('user_owned_players')
        .select('squad_order')
        .eq('user_id', userId).eq('sport', 'cricket')
        .order('squad_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      nextOrder = (maxRow ? maxRow.squad_order : 0) + 1;
    }

    const { error: insertError } = await supabase.from('user_owned_players').insert({
      user_id: userId,
      player_id: playerId,
      sport: sport,
      squad_order: nextOrder
    });

    if (insertError) {
      console.error("Award player error:", insertError);
      return { success: false, error: 'Failed to record award.' };
    }

    await updateUserRating(userId);

    return { success: true, alreadyOwned: false };
  } catch (e) {
    console.error("Award player transaction failed:", e);
    return { success: false, error: 'Award failed due to database error.' };
  } finally {
    releaseLock(release);
  }
}

async function getUserCricketTeam(userId) {
  if (!supabase) return [];
  try {
    const { data: owned, error: ownedError } = await supabase
      .from('user_owned_players')
      .select('player_id, squad_order')
      .eq('user_id', userId)
      .eq('sport', 'cricket')
      .order('squad_order', { ascending: true });

    if (ownedError) {
      console.error("Error fetching user owned cricket players:", ownedError);
      return [];
    }
    if (!owned || owned.length === 0) return [];

    const playerIds = owned.map(o => o.player_id);
    const orderMap = {};
    owned.forEach(o => { orderMap[o.player_id] = o.squad_order || 0; });

    const { data: players, error: playersError } = await supabase
      .from('cricketplayers')
      .select('*')
      .in('id', playerIds);

    if (playersError) {
      console.error("Error fetching cricket players details:", playersError);
      return [];
    }

    // Attach squad_order to each player and sort
    const result = (players || []).map(p => ({ ...p, squad_order: orderMap[p.id] || 0 }));
    result.sort((a, b) => a.squad_order - b.squad_order);

    // Dynamically sort first 11 elements by role and OVR descending on the fly
    if (result.length >= 11) {
      const xi = result.slice(0, 11);
      const bench = result.slice(11);
      xi.sort((a, b) => {
        const roleOrder = { 'batsman': 1, 'wicket_keeper': 2, 'all_rounder': 3, 'bowler': 4 };
        const orderA = roleOrder[a.role] || 5;
        const orderB = roleOrder[b.role] || 5;
        if (orderA !== orderB) return orderA - orderB;
        return (b.ovr || 0) - (a.ovr || 0);
      });
      return [...xi, ...bench];
    }
    return result;
  } catch (e) {
    console.error("Failed to get user cricket team:", e);
    return [];
  }
}

async function swapSquadOrder(userId, pos1, pos2) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  const release = await acquireLock(userId);
  try {
    // 1. Get current squad sorted by squad_order ascending
    const { data: owned, error: ownedError } = await supabase
      .from('user_owned_players')
      .select('id, player_id, squad_order')
      .eq('user_id', userId)
      .eq('sport', 'cricket')
      .order('squad_order', { ascending: true });

    if (ownedError || !owned || owned.length === 0) {
      return { success: false, error: 'No players found in squad.' };
    }

    if (pos1 < 1 || pos1 > owned.length || pos2 < 1 || pos2 > owned.length) {
      return { success: false, error: `Invalid swap positions: 1 to ${owned.length} only.` };
    }

    // 2. Fetch details for role and OVR
    const playerIds = owned.map(o => o.player_id);
    const { data: details, error: detailsError } = await supabase
      .from('cricketplayers')
      .select('id, role, ovr')
      .in('id', playerIds);

    if (detailsError) {
      console.error("Error fetching player details during swap:", detailsError);
      return { success: false, error: 'Database error fetching player details.' };
    }

    const detailsMap = {};
    (details || []).forEach(d => {
      detailsMap[d.id] = d;
    });

    // 3. Swap the players in the array
    const temp = owned[pos1 - 1];
    owned[pos1 - 1] = owned[pos2 - 1];
    owned[pos2 - 1] = temp;

    // 4. Sort the Playing XI (first 11) by role and OVR descending
    const xi = owned.slice(0, 11);
    const bench = owned.slice(11);

    xi.sort((a, b) => {
      const detA = detailsMap[a.player_id] || { role: 'bowler', ovr: 0 };
      const detB = detailsMap[b.player_id] || { role: 'bowler', ovr: 0 };
      const roleOrder = { 'batsman': 1, 'wicket_keeper': 2, 'all_rounder': 3, 'bowler': 4 };
      const orderA = roleOrder[detA.role] || 5;
      const orderB = roleOrder[detB.role] || 5;
      if (orderA !== orderB) return orderA - orderB;
      return (detB.ovr || 0) - (detA.ovr || 0);
    });

    const newOwnedList = [...xi, ...bench];

    // 5. Update squad_order values in the database in a single batch
    const updates = newOwnedList.map((item, idx) => {
      return supabase
        .from('user_owned_players')
        .update({ squad_order: idx + 1 })
        .eq('id', item.id);
    });
    await Promise.all(updates);

    await updateUserRating(userId);

    return { success: true };
  } catch (e) {
    console.error("swapSquadOrder error:", e);
    return { success: false, error: 'Database error during swap.' };
  } finally {
    releaseLock(release);
  }
}

async function getCricketMatchById(matchId) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('id', matchId)
      .single();
    if (error) {
      console.error("[DB] Error fetching cricket match by id:", error);
      return null;
    }
    return data || null;
  } catch (e) {
    console.error("[DB] Error fetching cricket match by id:", e);
    return null;
  }
}

async function saveCricketMatch(matchId, chatId, hostId, guestId, status, stateJson) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('cricket_matches')
      .upsert({
        id: matchId,
        chat_id: chatId,
        host_id: hostId,
        guest_id: guestId,
        status: status,
        state_json: stateJson,
        updated_at: new Date().toISOString()
      });
    if (error) {
      console.error("[DB] Error saving cricket match:", error);
    }
  } catch (e) {
    console.error("[DB] Error saving cricket match:", e);
  }
}

async function getActiveCricketMatches() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .neq('status', 'completed');
    if (error) {
      console.error("[DB] Error fetching active cricket matches:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("[DB] Error fetching active cricket matches:", e);
    return [];
  }
}

async function getUserCricketMatchHistory(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('status', 'completed')
      .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
      .order('updated_at', { ascending: false })
      .limit(10);
    if (error) {
      console.error("[DB] Error fetching user match history:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("[DB] Error fetching user match history:", e);
    return [];
  }
}

async function getAllUserCompletedMatches(userId) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('status', 'completed')
      .or(`host_id.eq.${userId},guest_id.eq.${userId}`)
      .order('updated_at', { ascending: false });
    if (error) {
      console.error("[DB] Error fetching all completed matches for user:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("[DB] Error fetching all completed matches for user:", e);
    return [];
  }
}

async function getAllCompletedMatches() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('cricket_matches')
      .select('*')
      .eq('status', 'completed');
    if (error) {
      console.error("[DB] Error fetching all completed matches globally:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("[DB] Error fetching all completed matches globally:", e);
    return [];
  }
}

async function removePlayerFromSquad(userId, playerId, sport) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  const release = await acquireLock(userId);
  try {
    const { data: existing, error: findError } = await supabase.from('user_owned_players')
      .select('id')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .eq('sport', sport)
      .maybeSingle();

    if (findError || !existing) {
      return { success: false, error: "Player is not in the user's squad." };
    }

    const { error: deleteError } = await supabase.from('user_owned_players')
      .delete()
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .eq('sport', sport);

    if (deleteError) {
      console.error("[DB] Delete owned player error:", deleteError);
      return { success: false, error: 'Failed to delete player from database.' };
    }

    await updateUserRating(userId);

    return { success: true };
  } catch (e) {
    console.error("[DB] Remove player exception:", e);
    return { success: false, error: 'An unexpected database error occurred.' };
  } finally {
    releaseLock(release);
  }
}

async function getCricketProfile(userId) {
  if (!supabase) return null;
  try {
    const profile = await getProfile(userId);
    if (!profile) return null;
    return {
      id: userId,
      telegramId: userId,
      username: profile.first_name,
      coins: profile.coins || 0,
      team_name: profile.team_name || `${profile.first_name || 'Player'}'s XI`
    };
  } catch (e) {
    console.error("[DB] Error getting cricket profile:", e);
    return null;
  }
}

async function updateCricketTeamName(userId, teamName) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ team_name: teamName })
      .eq('user_id', userId);
    if (error) {
      console.error("[DB] Error updating team name:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (e) {
    console.error("[DB] Exception updating team name:", e);
    return { success: false, error: e.message };
  }
}

async function claimStarterPack(userId) {
  if (!supabase) return { success: false, error: 'Database disabled' };
  
  const release = await acquireLock(userId);
  try {
    // 1. Check if user already claimed
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('claimed_starter')
      .eq('user_id', userId)
      .maybeSingle();
      
    if (profileError) {
      console.error("Error fetching profile for starter pack:", profileError);
      return { success: false, error: 'Database error fetching profile.' };
    }
    
    if (profile && profile.claimed_starter) {
      return { success: false, error: 'ALREADY_CLAIMED' };
    }
    
    // 2. Fetch all cricket players
    const players = await getCricketPlayers();
    if (!players || players.length === 0) {
      return { success: false, error: 'No players available in database.' };
    }
    
    // 3. Filter players
    // Low OVR players: OVR <= 75
    // Star players: OVR == 84
    const lowKeepers = players.filter(p => p.ovr && p.ovr <= 75 && p.role === 'wicket_keeper');
    const lowBatsmen = players.filter(p => p.ovr && p.ovr <= 75 && p.role === 'batsman');
    const lowAllRounders = players.filter(p => p.ovr && p.ovr <= 75 && p.role === 'all_rounder');
    const lowBowlers = players.filter(p => p.ovr && p.ovr <= 75 && p.role === 'bowler');
    const starPlayers = players.filter(p => p.ovr === 84);
    
    if (lowKeepers.length < 1 || lowBatsmen.length < 4 || lowAllRounders.length < 2 || lowBowlers.length < 4) {
      return { success: false, error: 'Insufficient low OVR players in database.' };
    }
    if (starPlayers.length < 1) {
      return { success: false, error: 'No 84 OVR star players found in database.' };
    }
    
    // 4. Pick 1 star player
    const selectedStar = starPlayers[Math.floor(Math.random() * starPlayers.length)];
    const starRole = selectedStar.role;
    
    // Target counts for the final Playing XI:
    // Wicket Keepers: 1, Batsmen: 4, All-Rounders: 2, Bowlers: 4
    let neededKeepers = 1;
    let neededBatsmen = 4;
    let neededAllRounders = 2;
    let neededBowlers = 4;
    
    if (starRole === 'wicket_keeper') neededKeepers--;
    else if (starRole === 'batsman') neededBatsmen--;
    else if (starRole === 'all_rounder') neededAllRounders--;
    else if (starRole === 'bowler') neededBowlers--;
    
    // Shuffle helper
    const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());
    
    const selectedKeepers = shuffle(lowKeepers).slice(0, neededKeepers);
    const selectedBatsmen = shuffle(lowBatsmen).slice(0, neededBatsmen);
    const selectedAllRounders = shuffle(lowAllRounders).slice(0, neededAllRounders);
    const selectedBowlers = shuffle(lowBowlers).slice(0, neededBowlers);
    
    const allSelected = [
      selectedStar,
      ...selectedKeepers,
      ...selectedBatsmen,
      ...selectedAllRounders,
      ...selectedBowlers
    ];
    const startSquadOrder = 1;
    
    // 5. Insert players into user_owned_players
    const inserts = allSelected.map((p, idx) => ({
      user_id: userId,
      player_id: p.id,
      sport: 'cricket',
      squad_order: startSquadOrder + idx
    }));
    
    const { error: insertError } = await supabase.from('user_owned_players').insert(inserts);
    if (insertError) {
      console.error("Error inserting starter pack players:", insertError);
      return { success: false, error: 'Failed to record awarded players.' };
    }
    
    // 7. Update profile to mark claimed_starter as true
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ claimed_starter: true })
      .eq('user_id', userId);
      
    if (updateError) {
      console.error("Error updating profile starter claim state:", updateError);
      return { success: false, error: 'Failed to update starter pack claim status.' };
    }
    
    await updateUserRating(userId);
    
    return { success: true, players: allSelected, isBackfill: false };
  } catch (e) {
    console.error("claimStarterPack exception:", e);
    return { success: false, error: 'An unexpected database error occurred.' };
  } finally {
    releaseLock(release);
  }
}

async function getUserTeamRating(userId) {
  if (!supabase) return 0;
  const { data: owned } = await supabase.from('user_owned_players').select('player_id').eq('user_id', userId).eq('sport', 'cricket');
  if (!owned || owned.length === 0) return 0;
  const cricket = await getCricketPlayers();
  const ovrMap = new Map((cricket || []).map(p => [p.id, p.ovr || 0]));
  
  const playerOvrs = owned.map(o => ovrMap.get(o.player_id) || 0);
  playerOvrs.sort((a, b) => b - a);
  const top11 = playerOvrs.slice(0, 11);
  if (top11.length === 0) return 0;
  return Math.round(top11.reduce((sum, ovr) => sum + ovr, 0) / 11);
}

async function updateUserRating(userId) {
  if (!supabase) return 0;
  try {
    const rating = await getUserTeamRating(userId);
    const { error } = await supabase.from('profiles').update({ rating }).eq('user_id', userId);
    if (error) {
      console.error(`[DB] Error updating profile rating for user ${userId}:`, error);
    }
    // Clear/invalidate cache
    leaderboardCache.clear();
    return rating;
  } catch (e) {
    console.error(`[DB] updateUserRating exception for user ${userId}:`, e);
    return 0;
  }
}

module.exports = {
  supabase,
  getUserTeamRating,
  updateUserRating,
  getUserCricketTeam,
  recordWin,
  recordLoss,
  getProfile,
  addCoins,
  addCoinsInternal,
  transferCoins,
  transferCoinsInternal,
  acquireLock,
  releaseLock,
  getGlobalLeaderboard,
  getGroupLeaderboard,
  getUserGlobalRank,
  getUserGroupRank,
  getGlobalStats,
  getGroupSettings,
  updateGroupSetting,
  getAllGroupIds,
  getAllUserIds,
  ensureUser,
  saveHiloGame,
  getHiloGame,
  deleteHiloGame,
  cleanupStaleHiloGames,
  claimDaily,
  claimGroupInviteReward,
  recordBonusClaim,
  checkAndClaimFreeSpin,
  getUserOwnedPlayers,
  getCricketPlayers,
  buyPlayer,
  sellPlayer,
  awardPlayer,
  checkJackpotClaimed,
  recordJackpotClaim,
  checkIsModerator,
  addModerator,
  DEFAULT_SETTINGS,
  saveCricketMatch,
  getCricketMatchById,
  getActiveCricketMatches,
  getUserCricketMatchHistory,
  getCricketProfile,
  updateCricketTeamName,
  claimStarterPack,
  swapSquadOrder,
  getAllUserCompletedMatches,
  getAllCompletedMatches,
  removePlayerFromSquad
};
