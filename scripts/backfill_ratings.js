require('dotenv').config();
const sb = require('../db/supabase');

async function backfill() {
  if (!sb.supabase) {
    console.error("Database connection is not available.");
    process.exit(1);
  }

  console.log("Checking if profiles table has the 'rating' column...");
  const { data: testProfiles, error: testError } = await sb.supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (testError) {
    console.error("Failed to fetch test profile:", testError);
    process.exit(1);
  }

  if (testProfiles && testProfiles.length > 0 && !('rating' in testProfiles[0])) {
    console.error("CRITICAL ERROR: The 'rating' column does not exist on the 'profiles' table yet.");
    console.error("Please run the SQL migration script in db/rating_migration.sql first!");
    process.exit(1);
  }

  console.log("Fetching all user profiles...");
  let allProfiles = [];
  let from = 0;
  let to = 999;
  
  while (true) {
    const { data, error } = await sb.supabase
      .from('profiles')
      .select('user_id')
      .range(from, to);
    
    if (error) {
      console.error("Error fetching profiles batch:", error);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    allProfiles = allProfiles.concat(data);
    if (data.length < 1000) break;
    from += 1000;
    to += 1000;
  }

  console.log(`Found ${allProfiles.length} profiles to backfill.`);
  
  const CONCURRENCY = 20;
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allProfiles.length; i += CONCURRENCY) {
    const batch = allProfiles.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (p) => {
      try {
        const rating = await sb.updateUserRating(p.user_id);
        successCount++;
        console.log(`[${successCount}/${allProfiles.length}] Updated user ${p.user_id} -> ${rating} OVR`);
      } catch (err) {
        failCount++;
        console.error(`Failed to update user ${p.user_id}:`, err);
      }
    }));
  }

  console.log(`\nBackfill complete! Success: ${successCount}, Failed: ${failCount}`);
}

backfill().catch(console.error);
