import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Crown, Upload, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Success() {
  const [, setLocation] = useLocation();
  const { user, refetchUser } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Get session_id from URL params
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      // Refetch user data to get updated premium status
      const checkStatus = async () => {
        setIsChecking(true);
        // Wait a moment for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        await refetchUser();
        setIsChecking(false);
      };
      checkStatus();
    } else {
      setIsChecking(false);
    }
  }, [refetchUser]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Confirming your subscription...</p>
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