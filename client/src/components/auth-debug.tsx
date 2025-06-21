import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/lib/supabase';

export function AuthDebug() {
  const { user, session, loading, signInWithGoogle } = useSupabaseAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const testGoogleAuth = async () => {
    console.log('=== TESTING GOOGLE AUTH ===');
    try {
      const result = await signInWithGoogle();
      console.log('Google auth result:', result);
      setDebugInfo({ type: 'google_auth', result });
    } catch (error) {
      console.error('Google auth error:', error);
      setDebugInfo({ type: 'google_auth_error', error });
    }
  };

  const testSessionStatus = async () => {
    console.log('=== TESTING SESSION STATUS ===');
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Session data:', data);
      console.log('Session error:', error);
      setDebugInfo({ type: 'session_check', data, error });
    } catch (error) {
      console.error('Session check error:', error);
      setDebugInfo({ type: 'session_check_error', error });
    }
  };

  const testBackendSync = async () => {
    console.log('=== TESTING BACKEND SYNC ===');
    if (!session?.access_token) {
      setDebugInfo({ type: 'backend_sync_error', error: 'No access token available' });
      return;
    }

    try {
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ user: session.user })
      });

      const responseData = await response.text();
      console.log('Backend sync response:', response.status, responseData);
      setDebugInfo({ 
        type: 'backend_sync', 
        status: response.status, 
        data: responseData,
        ok: response.ok 
      });
    } catch (error) {
      console.error('Backend sync error:', error);
      setDebugInfo({ type: 'backend_sync_error', error });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mb-8">
      <CardHeader>
        <CardTitle>Authentication Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Loading:</strong> {loading ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>User:</strong> {user ? 'Authenticated' : 'Not authenticated'}
          </div>
          <div>
            <strong>Session:</strong> {session ? 'Active' : 'None'}
          </div>
          <div>
            <strong>Access Token:</strong> {session?.access_token ? 'Present' : 'Missing'}
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={testGoogleAuth} className="w-full">
            Test Google OAuth
          </Button>
          <Button onClick={testSessionStatus} variant="outline" className="w-full">
            Check Session Status
          </Button>
          <Button onClick={testBackendSync} variant="outline" className="w-full" disabled={!session}>
            Test Backend Sync
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold mb-2">Debug Output:</h4>
            <pre className="text-xs overflow-auto max-h-64">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {user && (
          <div className="mt-4 p-4 bg-green-100 rounded-lg">
            <h4 className="font-semibold mb-2">User Info:</h4>
            <pre className="text-xs overflow-auto max-h-32">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}