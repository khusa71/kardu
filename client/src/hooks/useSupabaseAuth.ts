import { useState, useEffect } from 'react';
import { supabase, type User, type AuthSession } from '@/lib/supabase';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session);
      setSession(session as AuthSession);
      setUser(session?.user as User || null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('=== AUTH STATE CHANGE ===');
      console.log('Event:', event);
      console.log('Session:', session);
      console.log('Session user:', session?.user);
      console.log('Session access_token exists:', !!session?.access_token);
      
      setSession(session as AuthSession);
      setUser(session?.user as User || null);
      setLoading(false);
      
      // If user just signed in, sync with backend and handle redirect
      if (event === 'SIGNED_IN' && session) {
        console.log('Processing SIGNED_IN event...');
        
        try {
          console.log('Attempting backend sync...');
          const response = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              user: session.user
            })
          });
          
          console.log('Backend sync response status:', response.status);
          
          if (response.ok) {
            console.log('User synced with backend successfully');
            
            // Check if we should redirect to dashboard after OAuth
            const shouldRedirect = localStorage.getItem('redirectToDashboard');
            console.log('Should redirect to dashboard?', shouldRedirect);
            
            if (shouldRedirect === 'true') {
              console.log('Redirecting to dashboard after successful OAuth...');
              localStorage.removeItem('redirectToDashboard');
              
              // Small delay to ensure state is updated
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 100);
            }
          } else {
            const errorText = await response.text();
            console.warn('Failed to sync user with backend:', response.status, errorText);
          }
        } catch (error) {
          console.error('Error syncing user with backend:', error);
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing redirect flag');
        localStorage.removeItem('redirectToDashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    console.log('Attempting email sign in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    console.log('Email sign in result:', { data, error });
    return { data, error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    console.log('Attempting email sign up...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    console.log('Email sign up result:', { data, error });
    return { data, error };
  };

  const signInWithGoogle = async () => {
    console.log('Attempting Google sign in...');
    console.log('Current location:', window.location.href);
    console.log('Current hostname:', window.location.hostname);
    console.log('Current origin:', window.location.origin);
    
    // For Replit environment, we need to ensure the redirect URL is configured correctly in Supabase
    // The redirect URL must match exactly what's configured in the Supabase dashboard
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    console.log('Using redirect URL:', redirectTo);
    console.log('Note: Ensure this URL is added to Supabase Auth > Settings > Redirect URLs');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });
    console.log('Google sign in result:', { data, error });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email: string) => {
    // Detect environment and set appropriate redirect URL
    let redirectTo = `${window.location.origin}/reset-password`;
    
    // Check if we're in Replit dev environment
    if (window.location.hostname.includes('.replit.dev')) {
      redirectTo = `${window.location.origin}/reset-password`;
    }
    // Check if we're in production
    else if (window.location.hostname === 'kardu.io') {
      redirectTo = 'https://kardu.io/reset-password';
    }
    // For localhost development
    else if (window.location.hostname === 'localhost') {
      redirectTo = `${window.location.origin}/reset-password`;
    }
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    return { data, error };
  };

  const sendVerificationEmail = async (): Promise<void> => {
    if (!user?.email) {
      throw new Error('No user email found');
    }
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });
    
    if (error) {
      throw error;
    }
  };

  const refreshUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session as AuthSession);
    setUser(session?.user as User || null);
  };

  return {
    user,
    session,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    resetPassword,
    sendVerificationEmail,
    refreshUserData,
  };
}