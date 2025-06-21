import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback: Starting authentication process...');
        
        // First, handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setLocation('/');
          return;
        }

        console.log('Auth callback: Session data:', data);

        if (data.session) {
          console.log('Auth callback: Session found, redirecting to dashboard');
          
          // Set a flag to help with redirection
          localStorage.setItem('redirectToDashboard', 'true');
          
          // Sync user data with backend
          try {
            const response = await fetch('/api/auth/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.session.access_token}`
              },
              body: JSON.stringify({
                user: data.session.user
              })
            });
            
            if (response.ok) {
              console.log('Auth callback: User synced successfully');
            } else {
              console.warn('Auth callback: User sync failed, but continuing...');
            }
          } catch (syncError) {
            console.warn('Auth callback: User sync error:', syncError);
          }
          
          // Redirect to dashboard
          setLocation('/dashboard');
        } else {
          console.log('Auth callback: No session found, redirecting to home');
          setLocation('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setLocation('/');
      }
    };

    handleAuthCallback();
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">Completing authentication...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}