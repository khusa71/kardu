import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, Upload, ArrowRight, AlertCircle, RefreshCw } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Success() {
  const [, setLocation] = useLocation();
  const { user, refreshUserData } = useFirebaseAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const checkSubscriptionStatus = async () => {
    try {
      setIsChecking(true);
      setHasTimedOut(false);
      
      // First, try waiting for webhook processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh user data from server
      await refreshUserData();
      
      // Check if user is now premium
      if (user && (user as any).isPremium) {
        setIsChecking(false);
        toast({
          title: "Subscription activated!",
          description: "Welcome to StudyCards Pro!",
        });
        return;
      }
      
      // If not premium after initial check, try manual verification
      if (retryCount === 0) {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');
        
        if (sessionId) {
          try {
            console.log('Attempting manual verification with session:', sessionId);
            
            const response = await apiRequest("POST", "/api/verify-subscription", { sessionId });
            const result = await response.json();
            
            console.log('Verification response:', result);
            
            if (result.isPremium) {
              await refreshUserData();
              setIsChecking(false);
              toast({
                title: "Subscription activated!",
                description: "Welcome to StudyCards Pro!",
              });
              return;
            }
          } catch (verifyError) {
            console.error('Manual verification failed:', verifyError);
          }
        }
      }
      
      // If still not premium after multiple retries, show timeout
      if (retryCount >= 2) {
        setHasTimedOut(true);
        setIsChecking(false);
      } else {
        setRetryCount(prev => prev + 1);
        setTimeout(checkSubscriptionStatus, 5000);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      setHasTimedOut(true);
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Get session_id from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      checkSubscriptionStatus();
    } else {
      setIsChecking(false);
    }
  }, []);

  if (isChecking && !hasTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <div>
                <p className="text-muted-foreground mb-2">Confirming your subscription...</p>
                <p className="text-sm text-gray-500">This may take a few moments</p>
              </div>
              {retryCount > 0 && (
                <p className="text-xs text-gray-400">Retry {retryCount + 1}/3</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">Processing Your Subscription</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Your payment was successful, but we're still confirming your subscription. 
                  This sometimes takes a few extra minutes.
                </p>
              </div>
              <div className="space-y-3">
                <Button 
                  onClick={async () => {
                    setRetryCount(0);
                    // Try manual verification immediately on retry
                    const urlParams = new URLSearchParams(window.location.search);
                    const sessionId = urlParams.get('session_id');
                    
                    if (sessionId) {
                      try {
                        const response = await apiRequest("POST", "/api/verify-subscription", { sessionId });
                        const result = await response.json();
                        
                        if (result.isPremium) {
                          await refreshUserData();
                          setHasTimedOut(false);
                          toast({
                            title: "Subscription activated!",
                            description: "Welcome to StudyCards Pro!",
                          });
                          return;
                        }
                      } catch (error) {
                        console.error('Manual retry verification failed:', error);
                      }
                    }
                    
                    // Fallback to normal check if manual verification fails
                    checkSubscriptionStatus();
                  }}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Status Again
                </Button>
                <Link href="/">
                  <Button variant="outline" className="w-full">
                    Continue to Home
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-gray-500">
                If issues persist, contact support with your payment confirmation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl text-green-600">Welcome to StudyCards Pro!</CardTitle>
          <CardDescription className="text-lg">
            Your subscription has been activated successfully
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="h-6 w-6 text-yellow-600" />
              <h3 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">
                Pro Features Unlocked
              </h3>
            </div>
            
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Upload className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 dark:text-yellow-300">
                  100 uploads per month (vs 3 for free users)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 dark:text-yellow-300">
                  Priority processing for faster flashcard generation
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 dark:text-yellow-300">
                  Advanced export formats (Anki, CSV, JSON, Quizlet)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-700 dark:text-yellow-300">
                  Premium customer support
                </span>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              Ready to create amazing flashcards from your PDFs?
            </p>
            
            <div className="flex gap-3 justify-center">
              <Link href="/">
                <Button size="lg" className="gap-2">
                  Start Creating Flashcards
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/history">
                <Button variant="outline" size="lg">
                  View History
                </Button>
              </Link>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>You can manage your subscription anytime from your account settings.</p>
            <p className="mt-2">
              Questions? Contact us at support@studycards.com
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}