// Create a working test user with proper authentication
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

async function createTestUser() {
  console.log('Creating test user with proper authentication...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Create a test user that can actually sign in
    const testEmail = 'demo@kardu.io';
    const testPassword = 'demo123456';
    
    console.log('Creating demo user...');
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Demo User',
        full_name: 'Demo User'
      }
    });
    
    if (createError && !createError.message.includes('already exists')) {
      console.log('Failed to create user:', createError.message);
      return false;
    }
    
    const userId = newUser?.user?.id || 'c06363c1-507b-40d3-acaf-2baffb315b42';
    console.log('User ID:', userId);
    
    // Test sign-in with the created user
    console.log('\nTesting sign-in...');
    
    const anonSupabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log('Sign-in failed:', signInError.message);
      return false;
    }
    
    console.log('Sign-in successful');
    console.log('Access token generated:', signInData.session.access_token ? 'Yes' : 'No');
    
    // Test API call with the token
    console.log('\nTesting authenticated API call...');
    
    const response = await fetch('http://localhost:5000/api/auth/test', {
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    const result = await response.json();
    console.log('API test result:', result);
    
    // Sign out
    await anonSupabase.auth.signOut();
    
    console.log('\nDemo user created successfully!');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    console.log('You can now use these credentials to sign in on the frontend.');
    
    return true;
    
  } catch (error) {
    console.log('Failed to create test user:', error.message);
    return false;
  }
}

createTestUser().then(success => {
  console.log(success ? '\nTest user setup complete' : '\nTest user setup failed');
  process.exit(success ? 0 : 1);
});