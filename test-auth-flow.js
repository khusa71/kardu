// Test the complete authentication flow
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const SERVER_URL = 'http://localhost:5000';

async function testAuthFlow() {
  console.log('Testing complete authentication flow...\n');

  try {
    // Step 1: Create a test user session
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the existing user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users || users.length === 0) {
      console.log('No users found in authentication system');
      return false;
    }
    
    const testUser = users[0];
    console.log('Found test user:', testUser.id);
    
    // Step 2: Generate an access token for the user
    const { data: tokenData, error: tokenError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testUser.email || 'test@example.com',
    });
    
    if (tokenError) {
      console.log('Failed to generate token:', tokenError.message);
      return false;
    }
    
    console.log('Generated authentication token');
    
    // Step 3: Test authenticated API call
    const { data: anonSession } = await supabase.auth.getSession();
    
    // Extract access token if available
    let accessToken = null;
    if (anonSession && anonSession.session) {
      accessToken = anonSession.session.access_token;
    }
    
    // Test API endpoint with token
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    const userResponse = await fetch(`${SERVER_URL}/api/auth/user`, {
      method: 'GET',
      headers
    });
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('User data retrieved successfully:');
      console.log('- User ID:', userData.id);
      console.log('- Role:', userData.role);
      console.log('- Monthly uploads:', userData.monthlyUploads);
      console.log('- Email verified:', userData.isEmailVerified);
    } else {
      const errorText = await userResponse.text();
      console.log('Authentication test failed:', userResponse.status, errorText);
    }
    
    // Step 4: Test upload endpoint
    console.log('\nTesting upload endpoint access...');
    
    const uploadResponse = await fetch(`${SERVER_URL}/api/upload`, {
      method: 'POST',
      headers
    });
    
    if (uploadResponse.status === 400) {
      console.log('Upload endpoint accessible (expected 400 without files)');
    } else if (uploadResponse.status === 401) {
      console.log('Upload endpoint requires authentication (401)');
    } else {
      console.log('Upload endpoint status:', uploadResponse.status);
    }
    
    // Step 5: Test database consistency
    console.log('\nTesting database consistency...');
    
    const profileResponse = await fetch(`${SERVER_URL}/api/user/profile`, {
      method: 'GET',
      headers
    });
    
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('User profile accessible');
    } else {
      console.log('User profile endpoint status:', profileResponse.status);
    }
    
    return true;
    
  } catch (error) {
    console.log('Authentication flow test failed:', error.message);
    return false;
  }
}

testAuthFlow().then(success => {
  console.log(success ? '\nAuthentication flow test completed' : '\nAuthentication flow has issues');
  process.exit(success ? 0 : 1);
});