import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { NavigationBar } from "@/components/navigation-bar";
import { ChevronLeft, ChevronRight, RotateCcw, Home, BookOpen, CheckCircle, XCircle, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";

interface FlashcardPair {
  question: string;
  answer: string;
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

interface StudyProgress {
  id: number;
  cardIndex: number;
  status: string;
  difficultyRating?: string;
  reviewCount: number;
}

interface StudyStats {
  total: number;
  known: number;
  reviewing: number;
}

export default function Study() {
  const { jobId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State variables
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Fetch flashcard job data
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: () => fetch(`/api/jobs/${jobId}`).then(res => res.json()),
    enabled: !!jobId
  });

  // Fetch study progress
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['/api/study-progress', jobId],
    enabled: !!jobId
  });

  // Study progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: (data: { jobId: number; cardIndex: number; status: string; difficultyRating?: string }) =>
      apiRequest('POST', '/api/study-progress', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/study-progress', jobId] });
      toast({
        title: "Progress Updated",
        description: "Your study progress has been saved."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save study progress",
        variant: "destructive",
      });
    },
  });

  // Computed values - normalize flashcard data structure
  const flashcards: FlashcardPair[] = (() => {
    console.log('JobData:', jobData);
    console.log('Has flashcards:', jobData?.hasFlashcards);
    console.log('Flashcards raw:', jobData?.flashcards);
    
    if (!jobData?.hasFlashcards || !jobData?.flashcards) {
      return [];
    }
    
    try {
      const parsed = JSON.parse(jobData.flashcards);
      console.log('Parsed flashcards:', parsed);
      
      const normalized = parsed.map((card: any) => ({
        question: card.question || card.front || '',
        answer: card.answer || card.back || '',
        topic: card.topic || card.subject || '',
        difficulty: card.difficulty || 'beginner'
      }));
      
      console.log('Normalized flashcards:', normalized);
      return normalized;
    } catch (error) {
      console.error('Error parsing flashcards:', error);
      return [];
    }
  })();
  const progress: StudyProgress[] = (progressData as any)?.progress || [];
  const stats: StudyStats = (progressData as any)?.stats || { total: flashcards.length, known: 0, reviewing: 0 };
  const currentCard = flashcards[currentCardIndex];
  const currentProgress = progress.find(p => p.cardIndex === currentCardIndex);
  const progressPercentage = flashcards.length > 0 ? Math.round(((stats.known + stats.reviewing) / stats.total) * 100) : 0;

  // Navigation functions
  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
      setIsFlipped(false);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
      setIsFlipped(false);
    }
  };

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  const handleMarkCardStatus = (status: string, difficultyRating?: string) => {
    if (!jobId || currentCardIndex === undefined) return;
    
    updateProgressMutation.mutate({
      jobId: parseInt(jobId),
      cardIndex: currentCardIndex,
      status,
      difficultyRating
    });
    
    // Auto-advance to next card after marking
    setTimeout(() => {
      if (currentCardIndex < flashcards.length - 1) {
        handleNextCard();
      }
    }, 1000);
  };

  const handleResetStudy = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsFlipped(false);
  };

  // Loading states
  if (jobLoading || progressLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error handling for missing data
  if (!jobData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md">
            <CardContent className="text-center p-8">
              <div className="text-red-500 mb-4">
                <XCircle className="w-16 h-16 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Flashcard Set Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The flashcard set you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => window.location.href = '/history'}>
                <Home className="w-4 h-4 mr-2" />
                Back to History
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md">
            <CardContent className="text-center p-8">
              <div className="text-yellow-500 mb-4">
                <Clock className="w-16 h-16 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Flashcards Available</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This flashcard set is empty or still being processed. Please check back later or regenerate the flashcards.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.href = '/history'}>
                  <Home className="w-4 h-4 mr-2" />
                  Back to History
                </Button>
                {jobData.status === 'completed' && (
                  <Button onClick={() => window.location.href = `/regenerate/${jobId}`}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavigationBar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Study Mode</h1>
              <p className="text-gray-600 dark:text-gray-400">{jobData.filename}</p>
            </div>
            <Badge variant="outline" className="flex items-center space-x-1">
              <BookOpen className="w-4 h-4" />
              <span>{jobData.subject}</span>
            </Badge>
          </div>

          {/* Progress Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Cards</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.known}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Known</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.reviewing}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Reviewing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{progressPercentage}%</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Progress</div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <Progress value={(currentCardIndex + 1) / flashcards.length * 100} className="w-full" />
          </div>
        </div>

        {/* Flashcard */}
        <Card className="min-h-[400px] mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {showAnswer ? 'Answer' : 'Question'}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFlipCard}
              >
                {showAnswer ? 'Hide Answer' : 'Show Answer'}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !className;
                      
                      return !isInline && match ? (
                        <SyntaxHighlighter
                          style={tomorrow as any}
                          language={match[1]}
                          PreTag="div"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {showAnswer ? currentCard?.answer || "" : currentCard?.question || ""}
                </ReactMarkdown>
              </div>
              
              {currentCard?.topic && (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Badge variant="secondary">{currentCard.topic}</Badge>
                  {currentCard.difficulty && (
                    <Badge variant="outline">{currentCard.difficulty}</Badge>
                  )}
                  {currentProgress && (
                    <Badge variant="outline">
                      Reviewed {currentProgress.reviewCount} times
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Study Actions */}
        {showAnswer && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">How well did you know this?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleMarkCardStatus('difficult', 'hard')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Again (Hard)
                </Button>
                <Button
                  variant="outline"
                  className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                  onClick={() => handleMarkCardStatus('reviewing', 'medium')}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Good (Medium)
                </Button>
                <Button
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => handleMarkCardStatus('known', 'easy')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Easy (Known)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePreviousCard}
            disabled={currentCardIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetStudy}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/history'}>
              <Home className="w-4 h-4 mr-2" />
              Back to History
            </Button>
          </div>
          
          <Button
            variant="outline"
            onClick={handleNextCard}
            disabled={currentCardIndex === flashcards.length - 1}
          >
            Next
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
}