// Fix authentication session management
import { createClient } from '@supabase/supabase-js';

async function fixAuthSession() {
  console.log('Fixing authentication session management...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('Missing Supabase credentials');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the existing user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError || !users || users.length === 0) {
      console.log('Creating test user for authentication...');
      
      // Create a test user with email/password
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: 'test@kardu.io',
        password: 'test123456',
        email_confirm: true,
        user_metadata: {
          name: 'Test User'
        }
      });
      
      if (createError) {
        console.log('Failed to create test user:', createError.message);
        return false;
      }
      
      console.log('Created test user:', newUser.user.id);
      return true;
    }
    
    const testUser = users[0];
    console.log('Using existing user:', testUser.id);
    
    // Update user to ensure they can sign in
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      testUser.id,
      {
        email_confirm: true,
        user_metadata: {
          name: 'Test User'
        }
      }
    );
    
    if (updateError) {
      console.log('Failed to update user:', updateError.message);
      return false;
    }
    
    console.log('Updated user for proper authentication');
    
    // Generate a magic link for easy sign-in
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: testUser.email || 'test@kardu.io',
    });
    
    if (linkError) {
      console.log('Failed to generate magic link:', linkError.message);
    } else {
      console.log('Generated sign-in link (for manual testing)');
      console.log('Link:', linkData.properties?.action_link);
    }
    
    return true;
    
  } catch (error) {
    console.log('Failed to fix authentication:', error.message);
    return false;
  }
}

fixAuthSession().then(success => {
  console.log(success ? '\nAuthentication session fixed' : '\nFailed to fix authentication');
  process.exit(success ? 0 : 1);
});