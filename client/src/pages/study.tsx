import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { NavigationBar } from "@/components/navigation-bar";
import { OptimizedStudyMode } from "@/components/optimized-study-mode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Brain, Trophy, Clock, TrendingUp, Home } from "lucide-react";

interface StudySession {
  sessionId: string;
  startTime: number;
  totalCards: number;
  cardsStudied: number;
  accuracy: number;
}

export default function Study() {
  const { jobId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Study mode state
  const [isStudying, setIsStudying] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [completedSession, setCompletedSession] = useState<StudySession | null>(null);

  // Fetch job data for title and subject with authentication
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: () => apiRequest('GET', `/api/jobs/${jobId}`),
    enabled: !!jobId
  });

  const handleSessionComplete = (session: StudySession) => {
    setCompletedSession(session);
    setSessionComplete(true);
    setIsStudying(false);
    
    toast({
      title: "Study Session Complete!",
      description: `Studied ${session.cardsStudied} cards with ${Math.round(session.accuracy)}% accuracy`,
    });
  };

  const handleExitStudy = () => {
    setIsStudying(false);
    setSessionComplete(false);
    setLocation('/dashboard');
  };

  const startStudySession = () => {
    setIsStudying(true);
    setSessionComplete(false);
  };

  if (jobLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading study session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!jobData || (jobData as any).status !== 'completed') {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center py-8">
            <CardContent>
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Flashcards Not Ready</h2>
              <p className="text-muted-foreground mb-4">
                This flashcard set is not ready for study yet.
              </p>
              <Button onClick={() => setLocation('/dashboard')} variant="outline">
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {isStudying ? (
          // Active study mode using optimized component
          <OptimizedStudyMode
            jobId={parseInt(jobId!)}
            onComplete={handleSessionComplete}
            onExit={handleExitStudy}
          />
        ) : sessionComplete && completedSession ? (
          // Session completion summary
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <Trophy className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">Session Complete!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{completedSession.cardsStudied}</div>
                    <div className="text-sm text-muted-foreground">Cards Studied</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-500">{Math.round(completedSession.accuracy)}%</div>
                    <div className="text-sm text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-500">
                      {Math.round((Date.now() - completedSession.startTime) / 60000)}m
                    </div>
                    <div className="text-sm text-muted-foreground">Duration</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-purple-500">{completedSession.totalCards}</div>
                    <div className="text-sm text-muted-foreground">Total Cards</div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={startStudySession}
                    className="flex-1"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Study Again
                  </Button>
                  <Button 
                    onClick={() => setLocation('/dashboard')}
                    variant="outline"
                    className="flex-1"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Study session start screen
          <div className="max-w-2xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{(jobData as any).filename}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{(jobData as any).subject}</Badge>
                      <Badge variant="outline">{(jobData as any).difficulty}</Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-xl font-bold text-primary">
                      {(jobData as any).flashcards?.length || (jobData as any).flashcardCount || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Flashcards</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-xl font-bold text-blue-500">{(jobData as any).pagesProcessed || (jobData as any).pageCount || 0}</div>
                    <div className="text-sm text-muted-foreground">Pages</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-xl font-bold text-green-500">
                      <Clock className="w-5 h-5 mx-auto" />
                    </div>
                    <div className="text-sm text-muted-foreground">Optimized</div>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-muted-foreground">
                  <h4 className="font-medium text-foreground">Enhanced Study Features:</h4>
                  <ul className="space-y-1 ml-4">
                    <li>• Intelligent spaced repetition algorithm</li>
                    <li>• Real-time progress tracking with batch sync</li>
                    <li>• Adaptive difficulty based on performance</li>
                    <li>• Optimized for fast, smooth study sessions</li>
                  </ul>
                </div>

                <Button 
                  onClick={startStudySession}
                  className="w-full"
                  size="lg"
                >
                  <Brain className="w-5 h-5 mr-2" />
                  Start Optimized Study Session
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}