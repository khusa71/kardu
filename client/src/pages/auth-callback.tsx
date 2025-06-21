import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for error in URL first
        const urlParams = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(window.location.hash.substring(1));
        
        if (urlParams.get('error') || fragment.get('error')) {
          const errorMsg = urlParams.get('error_description') || fragment.get('error_description') || 'Authentication failed';
          setError(errorMsg);
          setProcessing(false);
          setTimeout(() => setLocation('/'), 3000);
          return;
        }
        
        // Wait for Supabase to process the auth callback
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the current session after OAuth processing
        let sessionResult = await supabase.auth.getSession();
        
        // If no session immediately, try refreshing
        if (!sessionResult.data.session) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          sessionResult = await supabase.auth.getSession();
        }
        
        const { data, error: sessionError } = sessionResult;
        
        if (sessionError) {
          setError('Failed to establish session');
          setProcessing(false);
          setTimeout(() => setLocation('/'), 3000);
          return;
        }

        if (data.session && data.session.user) {
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
              const userData = await response.json();
            } else {
              const errorData = await response.text();
              
              // If sync fails, show error and don't redirect
              setError(`Authentication failed: ${errorData || 'Failed to sync user data'}`);
              setProcessing(false);
              setTimeout(() => setLocation('/'), 3000);
              return;
            }
          } catch (syncError) {
            setError('Failed to connect to authentication service');
            setProcessing(false);
            setTimeout(() => setLocation('/'), 3000);
            return;
          }
          
          setProcessing(false);
          
          // Clean URL and redirect
          window.history.replaceState({}, document.title, '/dashboard');
          setLocation('/dashboard');
        } else {
          setError('Authentication session not established');
          setProcessing(false);
          setTimeout(() => setLocation('/'), 3000);
        }
      } catch (error) {
        setError('An unexpected error occurred during authentication');
        setProcessing(false);
        setTimeout(() => setLocation('/'), 3000);
      }
    };

    handleAuthCallback();
  }, [setLocation]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2 text-red-600">Authentication Error</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <p className="text-xs text-gray-500">Redirecting to home page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-2">
          {processing ? 'Completing authentication...' : 'Redirecting to dashboard...'}
        </h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}