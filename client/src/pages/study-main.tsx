import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NavigationBar } from "@/components/navigation-bar";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Link } from "wouter";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle, Eye, EyeOff, Play, FileText } from "lucide-react";
import type { FlashcardJob } from "@shared/schema";

interface FlashcardPair {
  front: string;
  back: string;
}

export default function StudyMain() {
  const { user, loading } = useFirebaseAuth();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyProgress, setStudyProgress] = useState<{[key: number]: 'easy' | 'medium' | 'hard'}>({});
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [currentFlashcards, setCurrentFlashcards] = useState<FlashcardPair[]>([]);

  // Fetch user jobs for study selection
  const { data: userJobs = [], isLoading } = useQuery<FlashcardJob[]>({
    queryKey: ["/api/history"],
    enabled: !!user,
  });

  // Get completed jobs with flashcards
  const completedJobs = userJobs.filter(job => 
    job.status === 'completed' && job.flashcards && job.flashcards.length > 0
  );

  const loadJobFlashcards = (job: FlashcardJob) => {
    if (job.flashcards) {
      const flashcards = typeof job.flashcards === 'string' 
        ? JSON.parse(job.flashcards) 
        : job.flashcards;
      setCurrentFlashcards(flashcards);
      setSelectedJobId(job.id);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setStudyProgress({});
    }
  };

  const navigateCard = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentCardIndex < currentFlashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else if (direction === 'prev' && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
    setShowAnswer(false);
  };

  const markDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    setStudyProgress(prev => ({
      ...prev,
      [currentCardIndex]: difficulty
    }));
    
    // Auto advance to next card
    if (currentCardIndex < currentFlashcards.length - 1) {
      setTimeout(() => {
        navigateCard('next');
      }, 500);
    }
  };

  const resetProgress = () => {
    setStudyProgress({});
    setCurrentCardIndex(0);
    setShowAnswer(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md">
            <CardContent className="text-center p-8">
              <h2 className="text-xl font-semibold mb-4">Sign in required</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please sign in to access your study materials.
              </p>
              <Link href="/">
                <Button>Go to Home</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Job selection view
  if (!selectedJobId || currentFlashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-8">
            <BookOpen className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Study Mode</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Select a completed job to start studying your flashcards
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : completedJobs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No study materials available
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Upload and process some PDFs first to create flashcards for studying.
              </p>
              <div className="space-x-4">
                <Link href="/upload">
                  <Button>Upload PDF</Button>
                </Link>
                <Link href="/history">
                  <Button variant="outline">View History</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Available Study Materials ({completedJobs.length})
              </h2>
              
              <div className="grid gap-4">
                {completedJobs.map((job) => (
                  <Card key={job.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => loadJobFlashcards(job)}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {job.filename}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span>{job.flashcardCount || 0} cards</span>
                            <span className="capitalize">{job.subject}</span>
                            <span className="capitalize">{job.difficulty}</span>
                            <Badge variant="secondary">{job.status}</Badge>
                          </div>
                        </div>
                        <Button>
                          <Play className="w-4 h-4 mr-2" />
                          Study
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Study interface
  const currentCard = currentFlashcards[currentCardIndex];
  const progressPercentage = Math.round(((currentCardIndex + 1) / currentFlashcards.length) * 100);
  const studiedCards = Object.keys(studyProgress).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavigationBar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Study Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={() => {
              setSelectedJobId(null);
              setCurrentFlashcards([]);
            }}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back to Selection
            </Button>
            
            <Button variant="outline" onClick={resetProgress}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Progress
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Card {currentCardIndex + 1} of {currentFlashcards.length}</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Flashcard */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center min-h-[300px] flex flex-col justify-center">
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                  {showAnswer ? 'Answer' : 'Question'}
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg">
                    {showAnswer ? currentCard.back : currentCard.front}
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowAnswer(!showAnswer)}
                className="mx-auto"
              >
                {showAnswer ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Answer
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Show Answer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Study Actions */}
        <div className="space-y-6">
          {/* Difficulty Rating (only when answer is shown) */}
          {showAnswer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">How well did you know this?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={studyProgress[currentCardIndex] === 'hard' ? 'default' : 'outline'}
                    onClick={() => markDifficulty('hard')}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Hard
                  </Button>
                  <Button
                    variant={studyProgress[currentCardIndex] === 'medium' ? 'default' : 'outline'}
                    onClick={() => markDifficulty('medium')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    Medium
                  </Button>
                  <Button
                    variant={studyProgress[currentCardIndex] === 'easy' ? 'default' : 'outline'}
                    onClick={() => markDifficulty('easy')}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Easy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Navigation */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigateCard('prev')}
              disabled={currentCardIndex === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Studied: {studiedCards} / {currentFlashcards.length}
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={() => navigateCard('next')}
              disabled={currentCardIndex === currentFlashcards.length - 1}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Study Complete */}
        {studiedCards === currentFlashcards.length && (
          <Card className="mt-8 border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-green-800 dark:text-green-200 mb-2">
                Study Session Complete!
              </h2>
              <p className="text-green-700 dark:text-green-300 mb-6">
                You've reviewed all {currentFlashcards.length} flashcards in this set.
              </p>
              <div className="space-x-4">
                <Button onClick={resetProgress}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Study Again
                </Button>
                <Button variant="outline" onClick={() => {
                  setSelectedJobId(null);
                  setCurrentFlashcards([]);
                }}>
                  Choose Different Set
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}