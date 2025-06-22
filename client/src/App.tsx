import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import History from "@/pages/history";
import Landing from "@/pages/landing";
import Success from "@/pages/success";
import NotFound from "@/pages/not-found";
import Study from "@/pages/study";
import StudyMain from "@/pages/study-main";

import AuthCallback from "@/pages/auth-callback";
import ResetPassword from "@/pages/reset-password";
import Settings from "@/pages/settings";
import Subscription from "@/pages/subscription";
import Analytics from "@/pages/analytics";
import Support from "@/pages/support";
import AdminPanel from "@/pages/admin-panel";

// Redirect component for authenticated users visiting root
function DashboardRedirect() {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    navigate('/dashboard');
  }, [navigate]);
  
  return null;
}

// Redirect component for unauthenticated users
function LoginRedirect() {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    navigate('/');
  }, [navigate]);
  
  return null;
}

function Router() {
  const { user, loading } = useSupabaseAuth();
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const [location, navigate] = useLocation();

  // Handle redirect after successful authentication
  useEffect(() => {
    if (!loading && user && location !== '/auth/callback') {
      // If user is authenticated and not on auth callback, redirect to dashboard
      if (location === '/') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, location, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📡</div>
          <h2 className="text-xl font-semibold mb-2">No Internet Connection</h2>
          <p className="text-muted-foreground">Please check your connection and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Landing} />
      <Route path="/dashboard" component={user ? Dashboard : LoginRedirect} />
      <Route path="/upload" component={user ? Upload : LoginRedirect} />
      <Route path="/history" component={user ? History : LoginRedirect} />
      <Route path="/study" component={user ? StudyMain : LoginRedirect} />
      <Route path="/study/:jobId" component={user ? Study : LoginRedirect} />
      <Route path="/settings" component={user ? Settings : LoginRedirect} />
      <Route path="/subscription" component={user ? Subscription : LoginRedirect} />
      <Route path="/analytics" component={user ? Analytics : LoginRedirect} />
      <Route path="/support" component={user ? Support : LoginRedirect} />
      <Route path="/admin" component={user ? AdminPanel : LoginRedirect} />
      <Route path="/success" component={Success} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
