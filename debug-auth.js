// Debug authentication flow and identify issues
import { createClient } from '@supabase/supabase-js';

async function debugAuthentication() {
  console.log('Debugging authentication flow...\n');

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  console.log('Environment check:');
  console.log('- SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  console.log('- SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('\n❌ Missing required Supabase credentials');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test Supabase connection
    console.log('\nTesting Supabase connection...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return false;
    }

    console.log(`✅ Supabase connected. Found ${users?.length || 0} users`);

    // Test database connection
    console.log('\nTesting database connection...');
    const { data: profiles, error: dbError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);

    if (dbError) {
      console.log('❌ Database connection failed:', dbError.message);
      return false;
    }

    console.log(`✅ Database connected. Found ${profiles?.length || 0} user profiles`);

    // Check for users without authentication
    if (profiles && profiles.length > 0) {
      console.log('\nUser profile analysis:');
      profiles.forEach((profile, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`- ID: ${profile.id}`);
        console.log(`- Email: ${profile.email || 'Not set'}`);
        console.log(`- Email verified: ${profile.is_email_verified}`);
        console.log(`- Role: ${profile.role}`);
        console.log(`- Monthly uploads: ${profile.monthly_uploads}/${profile.monthly_limit}`);
      });
    }

    // Test auth with anon key
    if (supabaseAnonKey) {
      console.log('\nTesting anonymous key authentication...');
      const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: session } = await anonSupabase.auth.getSession();
      console.log('Anonymous session status:', session.session ? 'Active' : 'None');
    }

    return true;

  } catch (error) {
    console.log('❌ Authentication debug failed:', error.message);
    return false;
  }
}

debugAuthentication().then(success => {
  console.log(success ? '\n✅ Authentication system operational' : '\n❌ Authentication issues found');
  process.exit(success ? 0 : 1);
});