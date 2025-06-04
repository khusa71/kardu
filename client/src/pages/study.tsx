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
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  // Fetch flashcard job data
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['/api/history'],
    select: (data: any[]) => data.find(job => job.id === parseInt(jobId!))
  });

  // Fetch study progress
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ['/api/study-progress', jobId],
    enabled: !!jobId
  });

  const flashcards: FlashcardPair[] = jobData?.hasFlashcards && jobData.flashcards 
    ? JSON.parse(jobData.flashcards) 
    : [];

  const progress: StudyProgress[] = progressData?.progress || [];
  const stats: StudyStats = progressData?.stats || { total: flashcards.length, known: 0, reviewing: 0 };

  // Update study progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ status, difficultyRating }: { status: string; difficultyRating?: string }) => {
      return fetch(`/api/study-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: parseInt(jobId!),
          cardIndex: currentCardIndex,
          status,
          difficultyRating
        })
      }).then(res => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/study-progress', jobId] });
      toast({
        title: "Progress Updated",
        description: "Your study progress has been saved."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update progress. Please try again.",
        variant: "destructive"
      });
    }
  });

  const currentCard = flashcards[currentCardIndex];
  const currentProgress = progress.find(p => p.cardIndex === currentCardIndex);
  const progressPercentage = flashcards.length > 0 ? Math.round(((stats.known + stats.reviewing) / stats.total) * 100) : 0;

  const handleCardAction = (status: string, difficultyRating?: string) => {
    updateProgressMutation.mutate({ status, difficultyRating });
    
    // Auto-advance to next card after marking
    setTimeout(() => {
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setShowAnswer(false);
        setIsFlipped(false);
      }
    }, 1000);
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
    setShowAnswer(!showAnswer);
  };

  const navigateCard = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    } else if (direction === 'next' && currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
    setShowAnswer(false);
    setIsFlipped(false);
  };

  const resetProgress = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setIsFlipped(false);
  };

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

  if (!jobData || !jobData.hasFlashcards) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md">
            <CardContent className="text-center p-6">
              <h2 className="text-xl font-semibold mb-2">No Flashcards Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This job doesn't have any flashcards available for study.
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
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Flashcard */}
        <div className="mb-8">
          <Card className={`min-h-[400px] cursor-pointer transition-transform duration-300 ${isFlipped ? 'transform rotateY-180' : ''}`}>
            <CardContent className="p-8 h-full flex flex-col justify-center">
              {!showAnswer ? (
                <div onClick={flipCard}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Question</h3>
                    {currentCard?.difficulty && (
                      <Badge variant={
                        currentCard.difficulty === 'beginner' ? 'default' :
                        currentCard.difficulty === 'intermediate' ? 'secondary' : 'destructive'
                      }>
                        {currentCard.difficulty}
                      </Badge>
                    )}
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={tomorrow}
                              language={match[1]}
                              PreTag="div"
                              {...props}
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
                      {currentCard?.question || ""}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-6 text-center text-gray-500 dark:text-gray-400">
                    Click to reveal answer
                  </div>
                </div>
              ) : (
                <div onClick={flipCard}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Answer</h3>
                    {currentProgress && (
                      <Badge variant="outline">
                        Reviewed {currentProgress.reviewCount} times
                      </Badge>
                    )}
                  </div>
                  <div className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={tomorrow}
                              language={match[1]}
                              PreTag="div"
                              {...props}
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
                      {currentCard?.answer || ""}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation and Actions */}
        <div className="space-y-4">
          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => navigateCard('prev')}
              disabled={currentCardIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              variant="outline"
              onClick={resetProgress}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>

            <Button
              variant="outline"
              onClick={() => navigateCard('next')}
              disabled={currentCardIndex === flashcards.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          {/* Study Actions */}
          {showAnswer && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                onClick={() => handleCardAction('known', 'easy')}
                disabled={updateProgressMutation.isPending}
                className="text-green-600 border-green-600 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Easy
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCardAction('known', 'medium')}
                disabled={updateProgressMutation.isPending}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Good
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCardAction('reviewing', 'hard')}
                disabled={updateProgressMutation.isPending}
                className="text-orange-600 border-orange-600 hover:bg-orange-50"
              >
                <Clock className="w-4 h-4 mr-2" />
                Hard
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCardAction('unknown')}
                disabled={updateProgressMutation.isPending}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Again
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}