import { useState, useEffect } from 'react';
import { supabase, type User, type AuthSession } from '@/lib/supabase';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let syncInProgress = false;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as AuthSession);
      setUser(session?.user as User || null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session as AuthSession);
      setUser(session?.user as User || null);
      setLoading(false);
      
      // If user just signed in, sync with backend (prevent duplicate calls)
      if (event === 'SIGNED_IN' && session && !syncInProgress) {
        syncInProgress = true;
        
        try {
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
          
          if (response.ok) {
            // Check if we should redirect to dashboard after OAuth
            const shouldRedirect = localStorage.getItem('redirectToDashboard');
            
            if (shouldRedirect === 'true') {
              localStorage.removeItem('redirectToDashboard');
              
              // Small delay to ensure state is updated
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 100);
            }
          }
        } catch (error) {
          // Sync failed but don't block user experience
        } finally {
          syncInProgress = false;
        }
      }
      
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('redirectToDashboard');
        syncInProgress = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signInWithGoogle = async () => {
    // Set redirect flag before starting OAuth flow
    localStorage.setItem('redirectToDashboard', 'true');
    
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo
      }
    });
    
    if (error) {
      localStorage.removeItem('redirectToDashboard');
    }
    
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