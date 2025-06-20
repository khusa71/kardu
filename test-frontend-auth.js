// Test frontend authentication flow
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

async function testFrontendAuth() {
  console.log('Testing frontend authentication flow...\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log('Missing frontend Supabase credentials');
    console.log('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1. Testing Supabase connection...');
    const { data: session } = await supabase.auth.getSession();
    console.log('   Session status:', session.session ? 'Active' : 'None');

    // Test 2: Try to sign in with email/password (create if needed)
    console.log('\n2. Testing email authentication...');
    
    const testEmail = 'demo@kardu.io';
    const testPassword = 'demo123456';
    
    // Try sign up first (will fail if user exists)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (signUpError && !signUpError.message.includes('already registered')) {
      console.log('   Sign up failed:', signUpError.message);
    } else {
      console.log('   Sign up successful or user exists');
    }
    
    // Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (signInError) {
      console.log('   Sign in failed:', signInError.message);
      return false;
    }
    
    console.log('   Sign in successful');
    console.log('   User ID:', signInData.user.id);
    console.log('   Access token length:', signInData.session.access_token.length);

    // Test 3: Make authenticated API calls
    console.log('\n3. Testing authenticated API calls...');
    
    const headers = {
      'Authorization': `Bearer ${signInData.session.access_token}`,
      'Content-Type': 'application/json'
    };
    
    // Test auth endpoint
    const authTest = await fetch('http://localhost:5000/api/auth/test', { headers });
    const authResult = await authTest.json();
    console.log('   Auth test:', authResult.authenticated ? 'Success' : 'Failed');
    
    // Test user endpoint
    const userTest = await fetch('http://localhost:5000/api/auth/user', { headers });
    if (userTest.ok) {
      const userData = await userTest.json();
      console.log('   User data retrieved:', userData.id ? 'Success' : 'Failed');
      console.log('   Monthly uploads:', userData.monthlyUploads + '/' + userData.monthlyLimit);
    } else {
      console.log('   User endpoint failed:', userTest.status);
    }

    // Test 4: Test upload endpoint
    console.log('\n4. Testing upload endpoint...');
    
    const uploadTest = await fetch('http://localhost:5000/api/upload', {
      method: 'POST',
      headers
    });
    
    if (uploadTest.status === 400) {
      console.log('   Upload endpoint accessible (expected 400 without files)');
    } else {
      console.log('   Upload endpoint status:', uploadTest.status);
    }

    // Clean up - sign out
    await supabase.auth.signOut();
    console.log('\n5. Signed out successfully');
    
    console.log('\nFrontend authentication test completed successfully!');
    console.log('\nTo use the frontend:');
    console.log('1. Go to the application URL');
    console.log('2. Click "Sign In" ');
    console.log('3. Use email: demo@kardu.io');
    console.log('4. Use password: demo123456');
    
    return true;
    
  } catch (error) {
    console.log('Frontend authentication test failed:', error.message);
    return false;
  }
}

testFrontendAuth().then(success => {
  console.log(success ? '\nAuthentication flow working' : '\nAuthentication needs fixing');
  process.exit(success ? 0 : 1);
});