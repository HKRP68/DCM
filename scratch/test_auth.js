const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ipyiazqxdanxdtdchbpn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlweWlhenF4ZGFueGR0ZGNoYnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzYxMTYsImV4cCI6MjA4ODcxMjExNn0.3ybTSv6bZsWonYHewgjOJsjnKDyMIU4-Fig9ivHN5pA';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

async function testAuth() {
  console.log("Testing Supabase auth flow...");
  
  // Use a unique email based on timestamp
  const timestamp = Date.now();
  const email = `test_tg_${timestamp}@example.com`;
  const password = `super_secret_pw_${timestamp}`;
  const username = `tg_user_${timestamp}`;
  
  try {
    // 1. Sign Up
    console.log(`Signing up user with email: ${email}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
        }
      }
    });
    
    if (signUpError) {
      console.error("SignUp error:", signUpError);
      return;
    }
    
    const userId = signUpData.user.id;
    console.log(`Sign up successful! User ID: ${userId}`);
    
    // Create an authenticated client instance with the user's session token
    const session = signUpData.session;
    if (!session) {
      console.log("Session not returned immediately (needs confirmation maybe?). Let's try signing in.");
    }
    
    // 2. Sign In
    console.log(`Signing in user...`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (signInError) {
      console.error("SignIn error:", signInError);
      return;
    }
    
    const accessToken = signInData.session.access_token;
    console.log("Sign in successful!");
    
    // Create authenticated client
    const userClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false
      }
    });
    await userClient.auth.setSession({
      access_token: accessToken,
      refresh_token: signInData.session.refresh_token
    });
    
    // 3. Select profile
    console.log("Fetching user profile...");
    const { data: profile, error: profileErr } = await userClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileErr) {
      console.error("Fetch profile error:", profileErr);
    } else {
      console.log("Fetched Profile successfully:", profile);
    }
    
    // 4. Update profile (e.g. team name)
    console.log("Updating team name...");
    const { data: updatedProfile, error: updateErr } = await userClient
      .from('profiles')
      .update({ team_name: 'Strikers XI' })
      .eq('id', userId)
      .select()
      .single();
      
    if (updateErr) {
      console.error("Update profile error:", updateErr);
    } else {
      console.log("Updated Profile successfully:", updatedProfile);
    }
    
  } catch (e) {
    console.error("Exception in auth test:", e);
  }
}

testAuth();
