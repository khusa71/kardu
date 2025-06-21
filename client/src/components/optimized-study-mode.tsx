import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Check, X, RotateCcw, Trophy, TrendingUp, Clock, Target } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OptimizedFlashcard {
  id: number;
  front: string;
  back: string;
  cardIndex: number;
  jobId: number;
  subject?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  progress: {
    status: 'new' | 'reviewing' | 'known';
    reviewCount: number;
    lastReviewedAt: Date | null;
    nextReviewDate: Date | null;
    difficultyRating: 'easy' | 'medium' | 'hard' | null;
  };
}

interface StudySession {
  sessionId: string;
  startTime: number;
  progressUpdates: Array<{
    cardIndex: number;
    status: string;
    difficultyRating: string;
    responseTime: number;
  }>;
  totalCards: number;
  cardsStudied: number;
  accuracy: number;
}

interface StudyData {
  flashcards: OptimizedFlashcard[];
  progress: any[];
  stats: { total: number; known: number; reviewing: number };
}

interface OptimizedStudyModeProps {
  jobId: number;
  onComplete?: (session: StudySession) => void;
  onExit?: () => void;
}

export function OptimizedStudyMode({ jobId, onComplete, onExit }: OptimizedStudyModeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Study session state
  const [session, setSession] = useState<StudySession>({
    sessionId: `session_${Date.now()}`,
    startTime: Date.now(),
    progressUpdates: [],
    totalCards: 0,
    cardsStudied: 0,
    accuracy: 0
  });

  // Database session tracking
  const [dbSessionId, setDbSessionId] = useState<string | null>(null);

  // Card navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [cardStartTime, setCardStartTime] = useState(Date.now());
  
  // Performance tracking
  const batchUpdateQueue = useRef<Array<any>>([]);
  const lastBatchUpdate = useRef(Date.now());

  // Optimized data loading using new endpoint with proper authentication
  const { data: studyData, isLoading, error } = useQuery<StudyData>({
    queryKey: ['/api/study-data', jobId],
    enabled: !!jobId,
    retry: 3,
    retryDelay: 1000
  });

  // Batch progress update mutation with enhanced error handling
  const batchUpdateMutation = useMutation({
    mutationFn: async (updates: Array<any>) => {
      return apiRequest('POST', '/api/study-progress/batch', {
        jobId,
        progressUpdates: updates
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/study-data', jobId] });
    },
    onError: (error) => {
      console.error('Batch update failed:', error);
      toast({
        title: "Sync Warning",
        description: "Some progress may not be saved. Check your connection.",
        variant: "destructive",
      });
    },
    retry: 2,
    retryDelay: 1000
  });

  // Session management mutations with enhanced error handling
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: { jobId: number; totalCards: number }) => {
      return apiRequest('POST', '/api/study-sessions', sessionData);
    },
    onSuccess: (data: any) => {
      setDbSessionId(data.sessionId);
      console.log('Study session created:', data.sessionId);
    },
    onError: (error) => {
      console.error('Failed to create study session:', error);
      toast({
        title: "Session Error",
        description: "Could not start study session. Progress may not be saved.",
        variant: "destructive",
      });
    },
    retry: 3
  });

  const completeSessionMutation = useMutation({
    mutationFn: async (stats: { sessionId: string; cardsStudied: number; accuracy: number }) => {
      return apiRequest('PUT', `/api/study-sessions/${stats.sessionId}/complete`, {
        cardsStudied: stats.cardsStudied,
        accuracy: stats.accuracy
      });
    },
    onSuccess: (data: any) => {
      console.log('Study session completed:', data);
    },
    onError: (error) => {
      console.error('Failed to complete study session:', error);
    },
    retry: 3
  });

  const flashcards: OptimizedFlashcard[] = (studyData as StudyData | undefined)?.flashcards || [];
  const currentCard = flashcards[currentIndex];
  const stats = (studyData as StudyData | undefined)?.stats || { total: 0, known: 0, reviewing: 0 };

  // Initialize session and create database session
  useEffect(() => {
    if (flashcards.length > 0 && !dbSessionId && !createSessionMutation.isPending) {
      setSession(prev => ({ ...prev, totalCards: flashcards.length }));
      
      // Create session in database with proper authentication
      console.log('Creating study session for job:', jobId);
      createSessionMutation.mutate({
        jobId,
        totalCards: flashcards.length
      });
    }
  }, [flashcards.length, jobId, dbSessionId, createSessionMutation.isPending]);

  // Auto-batch progress updates for performance with authentication retry
  useEffect(() => {
    const interval = setInterval(() => {
      if (batchUpdateQueue.current.length > 0 && !batchUpdateMutation.isPending) {
        const updates = [...batchUpdateQueue.current];
        batchUpdateQueue.current = [];
        batchUpdateMutation.mutate(updates);
        lastBatchUpdate.current = Date.now();
      }
    }, 3000); // Batch every 3 seconds

    return () => clearInterval(interval);
  }, [batchUpdateMutation]);

  // Queue progress update for batching
  const queueProgressUpdate = useCallback((cardIndex: number, status: string, difficultyRating: string) => {
    const responseTime = Date.now() - cardStartTime;
    
    const update = {
      cardIndex,
      status,
      difficultyRating,
      responseTime
    };

    batchUpdateQueue.current.push(update);
    
    // Update local session state
    setSession(prev => ({
      ...prev,
      progressUpdates: [...prev.progressUpdates, update],
      cardsStudied: prev.cardsStudied + 1,
      accuracy: prev.progressUpdates.length > 0 
        ? (prev.progressUpdates.filter(u => u.status !== 'unknown').length / prev.progressUpdates.length) * 100
        : status !== 'unknown' ? 100 : 0
    }));

    // Force immediate update if queue is large or it's been a while
    if (batchUpdateQueue.current.length >= 10 || Date.now() - lastBatchUpdate.current > 10000) {
      const updates = [...batchUpdateQueue.current];
      batchUpdateQueue.current = [];
      batchUpdateMutation.mutate(updates);
      lastBatchUpdate.current = Date.now();
    }
  }, [cardStartTime, batchUpdateMutation]);

  const handleResponse = useCallback((status: string, difficultyRating: string) => {
    if (!currentCard) return;

    queueProgressUpdate(currentCard.cardIndex, status, difficultyRating);

    // Auto-advance or complete session
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setCardStartTime(Date.now());
    } else {
      // Session complete - final batch update and session completion
      if (batchUpdateQueue.current.length > 0) {
        batchUpdateMutation.mutate([...batchUpdateQueue.current]);
        batchUpdateQueue.current = [];
      }

      // Complete database session tracking
      if (dbSessionId) {
        const accuracy = Math.round((session.accuracy || 0));
        console.log('Completing study session:', { sessionId: dbSessionId, cardsStudied: session.cardsStudied, accuracy });
        completeSessionMutation.mutate({
          sessionId: dbSessionId,
          cardsStudied: session.cardsStudied,
          accuracy
        });
      }

      onComplete?.(session);
    }
  }, [currentCard, currentIndex, flashcards.length, queueProgressUpdate, session, onComplete, batchUpdateMutation]);

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setCardStartTime(Date.now());
    }
  };

  const previousCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowAnswer(false);
      setCardStartTime(Date.now());
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading optimized study session...</p>
        </div>
      </div>
    );
  }

  if (error || !flashcards.length) {
    return (
      <div className="text-center py-8">
        <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">
          {error ? `Error loading study data: ${error.message}` : 'No flashcards available for study'}
        </p>
        <Button onClick={onExit} variant="outline">Return to Dashboard</Button>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Enhanced Progress Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{currentIndex + 1} / {flashcards.length}</Badge>
            <Badge variant={currentCard?.progress.status === 'known' ? 'default' : 
                           currentCard?.progress.status === 'reviewing' ? 'secondary' : 'outline'}>
              {currentCard?.progress.status || 'new'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{stats.known} known</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{Math.round((Date.now() - session.startTime) / 60000)}m</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>{Math.round(session.accuracy)}% accuracy</span>
            </div>
          </div>
        </div>
        <Button onClick={onExit} variant="outline" size="sm">Exit Study</Button>
      </div>

      {/* Progress Bar */}
      <Progress value={progress} className="h-2" />

      {/* Flashcard Display */}
      <Card className="min-h-[400px]">
        <CardHeader>
          <CardTitle className="text-center">
            {currentCard?.subject && (
              <Badge variant="secondary" className="mb-2">{currentCard.subject}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question */}
          <div className="text-center space-y-4">
            <div className="prose dark:prose-invert max-w-none">
              <div className="text-lg leading-relaxed">{currentCard?.front}</div>
            </div>
          </div>

          {/* Answer (when revealed) */}
          {showAnswer && (
            <div className="border-t pt-6 space-y-4">
              <div className="text-center text-muted-foreground text-sm">Answer:</div>
              <div className="prose dark:prose-invert max-w-none">
                <div className="leading-relaxed">{currentCard?.back}</div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            {!showAnswer ? (
              <Button 
                onClick={() => setShowAnswer(true)} 
                className="w-full"
                size="lg"
              >
                Show Answer
              </Button>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  onClick={() => handleResponse('unknown', 'hard')}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Don't Know
                </Button>
                <Button
                  onClick={() => handleResponse('reviewing', 'medium')}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Need Review
                </Button>
                <Button
                  onClick={() => handleResponse('known', 'easy')}
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Know It
                </Button>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button 
              onClick={previousCard} 
              disabled={currentIndex === 0}
              variant="outline"
            >
              Previous
            </Button>
            <Button 
              onClick={nextCard}
              disabled={currentIndex === flashcards.length - 1}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Study Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">{session.cardsStudied}</div>
          <div className="text-sm text-muted-foreground">Studied</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-500">{stats.known}</div>
          <div className="text-sm text-muted-foreground">Known</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-500">{stats.reviewing}</div>
          <div className="text-sm text-muted-foreground">Reviewing</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-500">{Math.round(session.accuracy)}%</div>
          <div className="text-sm text-muted-foreground">Accuracy</div>
        </Card>
      </div>
    </div>
  );
}