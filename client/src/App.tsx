import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import Home from "@/pages/home";
import Upload from "@/pages/upload";
import History from "@/pages/history";
import Landing from "@/pages/landing";
import Success from "@/pages/success";
import NotFound from "@/pages/not-found";
import Study from "@/pages/study";
import StudyMain from "@/pages/study-main";
import Admin from "@/pages/admin";

function Router() {
  const { user, loading } = useFirebaseAuth();
  const { isOnline, isSlowConnection } = useNetworkStatus();

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
      <Route path="/" component={user ? Home : Landing} />
      <Route path="/upload" component={user ? Upload : Landing} />
      <Route path="/history" component={user ? History : Landing} />
      <Route path="/study" component={user ? StudyMain : Landing} />
      <Route path="/study/:jobId" component={user ? Study : Landing} />
      <Route path="/admin" component={user ? Admin : Landing} />
      <Route path="/success" component={Success} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
