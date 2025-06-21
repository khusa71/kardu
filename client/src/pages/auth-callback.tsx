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
        console.log('=== AUTH CALLBACK START ===');
        console.log('Auth callback: Current URL:', window.location.href);
        console.log('Auth callback: Current pathname:', window.location.pathname);
        console.log('Auth callback: Current search:', window.location.search);
        console.log('Auth callback: Current hash:', window.location.hash);
        
        // Check for error in URL first
        const urlParams = new URLSearchParams(window.location.search);
        const fragment = new URLSearchParams(window.location.hash.substring(1));
        
        console.log('Auth callback: URL params:', Object.fromEntries(urlParams));
        console.log('Auth callback: Fragment params:', Object.fromEntries(fragment));
        
        // Log all URL components for debugging
        console.log('Auth callback: Full URL breakdown:');
        console.log('  - Protocol:', window.location.protocol);
        console.log('  - Host:', window.location.host);
        console.log('  - Pathname:', window.location.pathname);
        console.log('  - Search:', window.location.search);
        console.log('  - Hash:', window.location.hash);
        
        if (urlParams.get('error') || fragment.get('error')) {
          const errorMsg = urlParams.get('error_description') || fragment.get('error_description') || 'Authentication failed';
          console.error('Auth callback: OAuth error:', errorMsg);
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
          console.log('Auth callback: No immediate session, attempting refresh...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          sessionResult = await supabase.auth.getSession();
        }
        
        const { data, error: sessionError } = sessionResult;
        
        if (sessionError) {
          console.error('Auth callback: Session error:', sessionError);
          setError('Failed to establish session');
          setProcessing(false);
          setTimeout(() => setLocation('/'), 3000);
          return;
        }

        console.log('Auth callback: Session data:', data);

        if (data.session && data.session.user) {
          console.log('Auth callback: Valid session found');
          console.log('Auth callback: User:', data.session.user);
          
          // Sync user data with backend
          try {
            console.log('Auth callback: Attempting to sync user with backend');
            console.log('Auth callback: Access token:', data.session.access_token?.substring(0, 20) + '...');
            console.log('Auth callback: User data:', JSON.stringify(data.session.user, null, 2));
            
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
            
            console.log('Auth callback: Response status:', response.status);
            console.log('Auth callback: Response headers:', Object.fromEntries(response.headers));
            
            if (response.ok) {
              const userData = await response.json();
              console.log('Auth callback: User synced successfully:', userData);
            } else {
              const errorData = await response.text();
              console.error('Auth callback: User sync failed:', response.status, errorData);
              console.error('Auth callback: Response body:', errorData);
              
              // If sync fails, show error and don't redirect
              setError(`Authentication failed: ${errorData || 'Failed to sync user data'}`);
              setProcessing(false);
              setTimeout(() => setLocation('/'), 3000);
              return;
            }
          } catch (syncError) {
            console.error('Auth callback: User sync error:', syncError);
            setError('Failed to connect to authentication service');
            setProcessing(false);
            setTimeout(() => setLocation('/'), 3000);
            return;
          }
          
          console.log('Auth callback: Authentication complete, redirecting to dashboard');
          setProcessing(false);
          
          // Clean URL and redirect
          window.history.replaceState({}, document.title, '/dashboard');
          setLocation('/dashboard');
        } else {
          console.log('Auth callback: No valid session found after retries');
          setError('Authentication session not established');
          setProcessing(false);
          setTimeout(() => setLocation('/'), 3000);
        }
      } catch (error) {
        console.error('Auth callback: Unexpected error:', error);
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