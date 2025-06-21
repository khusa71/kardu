// Direct test of the auth sync endpoint
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  try {
    console.log('Testing Supabase authentication...');
    
    // Test Google OAuth (this will show what the actual flow looks like)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'http://localhost:3000/test'
      }
    });
    
    console.log('OAuth data:', data);
    console.log('OAuth error:', error);
    
    // Test session retrieval
    const session = await supabase.auth.getSession();
    console.log('Current session:', session.data);
    
    if (session.data.session) {
      // Test the auth sync endpoint
      const response = await fetch('http://localhost:5000/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`
        },
        body: JSON.stringify({
          user: session.data.session.user
        })
      });
      
      const result = await response.text();
      console.log('Auth sync response status:', response.status);
      console.log('Auth sync response:', result);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testAuth().catch(console.error);