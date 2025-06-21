// Quick debug script to test database and auth issues
import { createClient } from '@supabase/supabase-js';

async function debugAuth() {
  console.log('=== DEBUGGING AUTHENTICATION AND DATABASE ISSUES ===');
  
  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD;
  
  console.log('1. Environment Variables:');
  console.log('   SUPABASE_URL:', supabaseUrl ? '✓ Set' : '❌ Missing');
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '❌ Missing');
  console.log('   SUPABASE_DB_PASSWORD:', supabaseDbPassword ? '✓ Set' : '❌ Missing');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing required Supabase credentials');
    return;
  }
  
  // Test Supabase connection
  console.log('\n2. Testing Supabase Auth Service:');
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('   ✓ Supabase client created successfully');
    
    // Test auth functionality
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.log('   ❌ Auth test failed:', error.message);
    } else {
      console.log('   ✓ Auth service working, found', data.users.length, 'users');
    }
  } catch (error) {
    console.log('   ❌ Supabase connection failed:', error.message);
  }
  
  // Test database tables
  console.log('\n3. Testing Database Tables:');
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user_profiles table exists
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);
    
    if (profileError) {
      console.log('   ❌ user_profiles table issue:', profileError.message);
      console.log('      Code:', profileError.code);
      console.log('      Details:', profileError.details);
    } else {
      console.log('   ✓ user_profiles table accessible');
    }
    
    // Check flashcard_jobs table
    const { data: jobs, error: jobError } = await supabase
      .from('flashcard_jobs')
      .select('*')
      .limit(1);
    
    if (jobError) {
      console.log('   ❌ flashcard_jobs table issue:', jobError.message);
    } else {
      console.log('   ✓ flashcard_jobs table accessible');
    }
    
  } catch (error) {
    console.log('   ❌ Database test failed:', error.message);
  }
  
  // Test user creation flow
  console.log('\n4. Testing User Creation Flow:');
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create a test user profile (this would normally be done via trigger)
    const testUserId = 'test-user-' + Date.now();
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: testUserId,
        email: 'test@example.com',
        is_email_verified: true,
        is_premium: false,
        role: 'user',
        monthly_uploads: 0,
        monthly_limit: 3
      })
      .select()
      .single();
    
    if (createError) {
      console.log('   ❌ User profile creation failed:', createError.message);
      console.log('      Code:', createError.code);
      console.log('      Details:', createError.details);
    } else {
      console.log('   ✓ User profile created successfully:', newProfile.id);
      
      // Clean up test user
      await supabase.from('user_profiles').delete().eq('id', testUserId);
      console.log('   ✓ Test user cleaned up');
    }
    
  } catch (error) {
    console.log('   ❌ User creation test failed:', error.message);
  }
  
  console.log('\n=== DEBUG COMPLETE ===');
}

debugAuth().catch(console.error);