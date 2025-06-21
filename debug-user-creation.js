// Debug script to test the user creation process step by step
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

async function testUserCreation() {
  console.log('=== TESTING USER CREATION PROCESS ===');
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.log('❌ Missing required environment variables');
    return;
  }
  
  // 1. Test email/password signup
  console.log('\n1. Testing Email/Password Signup:');
  try {
    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('   Attempting signup with:', testEmail);
    
    const { data, error } = await clientSupabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.log('   ❌ Signup failed:', error.message);
      console.log('   Error details:', error);
    } else {
      console.log('   ✓ Signup successful');
      console.log('   User ID:', data.user?.id);
      console.log('   User email:', data.user?.email);
      console.log('   Email confirmed:', data.user?.email_confirmed_at);
      
      // 2. Test backend auth sync
      if (data.session) {
        console.log('\n2. Testing Backend Auth Sync:');
        try {
          const response = await fetch('http://localhost:5000/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({
              user: data.user
            })
          });
          
          console.log('   Response status:', response.status);
          
          if (response.ok) {
            const userData = await response.json();
            console.log('   ✓ Backend sync successful');
            console.log('   Profile created:', userData);
          } else {
            const errorText = await response.text();
            console.log('   ❌ Backend sync failed:', errorText);
          }
        } catch (syncError) {
          console.log('   ❌ Backend sync error:', syncError.message);
        }
        
        // Clean up test user
        console.log('\n3. Cleaning up test user...');
        const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
        await adminSupabase.auth.admin.deleteUser(data.user.id);
        console.log('   ✓ Test user deleted');
      }
    }
  } catch (error) {
    console.log('   ❌ Signup test failed:', error.message);
  }
  
  // 4. Test direct database user creation
  console.log('\n4. Testing Direct Database User Creation:');
  try {
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const testUserId = `test-direct-${Date.now()}`;
    const { data: profile, error: profileError } = await adminSupabase
      .from('user_profiles')
      .insert({
        id: testUserId,
        email: 'test-direct@example.com',
        is_email_verified: true,
        is_premium: false,
        role: 'user',
        monthly_uploads: 0,
        monthly_limit: 3
      })
      .select()
      .single();
    
    if (profileError) {
      console.log('   ❌ Direct database creation failed:', profileError.message);
      console.log('   Error code:', profileError.code);
      console.log('   Error details:', profileError.details);
    } else {
      console.log('   ✓ Direct database creation successful');
      console.log('   Profile:', profile);
      
      // Clean up
      await adminSupabase.from('user_profiles').delete().eq('id', testUserId);
      console.log('   ✓ Test profile cleaned up');
    }
  } catch (error) {
    console.log('   ❌ Direct database test failed:', error.message);
  }
  
  console.log('\n=== USER CREATION TEST COMPLETE ===');
}

testUserCreation().catch(console.error);