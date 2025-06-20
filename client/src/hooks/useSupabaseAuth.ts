import { useState, useEffect } from 'react';
import { supabase, type User, type AuthSession } from '@/lib/supabase';

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as AuthSession);
      setUser(session?.user as User || null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as AuthSession);
      setUser(session?.user as User || null);
      setLoading(false);
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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
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
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { data, error };
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
  };
}