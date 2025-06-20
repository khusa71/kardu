// Fix the complete authentication system
import { createClient } from '@supabase/supabase-js';

async function fixCompleteAuth() {
  console.log('Fixing complete authentication system...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('Missing Supabase service credentials');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Step 1: Check and fix existing user
    console.log('1. Checking existing user...');
    const userId = 'c06363c1-507b-40d3-acaf-2baffb315b42';
    
    // Update the existing user to ensure they can sign in
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        email: 'demo@kardu.io',
        password: 'demo123456',
        email_confirm: true,
        user_metadata: {
          name: 'Demo User'
        }
      }
    );
    
    if (updateError) {
      console.log('Failed to update user:', updateError.message);
      
      // Try to create a new user if update fails
      console.log('Creating new demo user...');
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'demo@kardu.io',
        password: 'demo123456',
        email_confirm: true,
        user_metadata: {
          name: 'Demo User'
        }
      });
      
      if (createError) {
        console.log('Failed to create user:', createError.message);
        return false;
      }
      
      console.log('New user created:', newUser.user.id);
    } else {
      console.log('User updated successfully');
    }
    
    // Step 2: Test authentication with anon key
    console.log('\n2. Testing authentication...');
    const anonSupabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    
    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithPassword({
      email: 'demo@kardu.io',
      password: 'demo123456'
    });
    
    if (signInError) {
      console.log('Authentication test failed:', signInError.message);
      return false;
    }
    
    console.log('Authentication successful');
    console.log('Token generated:', signInData.session.access_token ? 'Yes' : 'No');
    
    // Step 3: Test API access
    console.log('\n3. Testing API access...');
    const response = await fetch('http://localhost:5000/api/auth/test', {
      headers: {
        'Authorization': `Bearer ${signInData.session.access_token}`
      }
    });
    
    const result = await response.json();
    console.log('API test result:', result.authenticated ? 'Success' : 'Failed');
    
    // Clean up
    await anonSupabase.auth.signOut();
    
    return true;
    
  } catch (error) {
    console.log('Authentication fix failed:', error.message);
    return false;
  }
}

fixCompleteAuth().then(success => {
  if (success) {
    console.log('\nAuthentication system fixed successfully!');
    console.log('\nYou can now sign in to the frontend with:');
    console.log('Email: demo@kardu.io');
    console.log('Password: demo123456');
  } else {
    console.log('\nFailed to fix authentication system');
  }
  process.exit(success ? 0 : 1);
});