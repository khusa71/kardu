import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useFirebaseAuth } from './useFirebaseAuth';

/**
 * Route guard hook that redirects unauthenticated users to login
 * @param redirectTo - The path to redirect to if not authenticated (default: '/')
 */
export function useRequireAuth(redirectTo: string = '/') {
  const { user, loading } = useFirebaseAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate(redirectTo);
    }
  }, [user, loading, navigate, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
}

/**
 * Route guard hook that redirects authenticated users away from auth pages
 * @param redirectTo - The path to redirect to if authenticated (default: '/dashboard')
 */
export function useRedirectIfAuthenticated(redirectTo: string = '/dashboard') {
  const { user, loading } = useFirebaseAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      navigate(redirectTo);
    }
  }, [user, loading, navigate, redirectTo]);

  return { user, loading, isAuthenticated: !!user };
}