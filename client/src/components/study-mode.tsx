import { useState, useCallback, useEffect } from 'react';
import { FlashcardPair } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Check, X, RotateCcw, Trophy, TrendingUp } from 'lucide-react';

interface StudyCard extends FlashcardPair {
  status: 'new' | 'learning' | 'known';
  lastReviewed?: Date;
  nextReview?: Date;
  reviewCount: number;
  correctCount: number;
  interval: number; // Days until next review
}

interface StudyModeProps {
  flashcards: FlashcardPair[];
  onComplete?: (results: StudyResults) => void;
  onExit?: () => void;
}

interface StudyResults {
  totalCards: number;
  newCards: number;
  learningCards: number;
  knownCards: number;
  accuracy: number;
  timeSpent: number;
}

export function StudyMode({ flashcards, onComplete, onExit }: StudyModeProps) {
  const [studyCards, setStudyCards] = useState<StudyCard[]>(() => 
    flashcards.map(card => ({
      ...card,
      status: 'new' as const,
      reviewCount: 0,
      correctCount: 0,
      interval: 1
    }))
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime] = useState(Date.now());
  const [sessionStats, setSessionStats] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0
  });

  const currentCard = studyCards[currentIndex];
  const totalCards = studyCards.length;
  const progress = ((currentIndex) / totalCards) * 100;

  // Calculate spaced repetition intervals
  const calculateNextInterval = (card: StudyCard, isCorrect: boolean): number => {
    if (isCorrect) {
      // Increase interval using spaced repetition algorithm
      return Math.min(card.interval * 2.5, 180); // Max 6 months
    } else {
      // Reset to 1 day if incorrect
      return 1;
    }
  };

  const handleResponse = useCallback((isCorrect: boolean) => {
    if (!currentCard) return;

    const updatedCard: StudyCard = {
      ...currentCard,
      status: isCorrect ? 
        (currentCard.reviewCount >= 2 ? 'known' : 'learning') : 
        'learning',
      lastReviewed: new Date(),
      reviewCount: currentCard.reviewCount + 1,
      correctCount: currentCard.correctCount + (isCorrect ? 1 : 0),
      interval: calculateNextInterval(currentCard, isCorrect)
    };

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + updatedCard.interval);
    updatedCard.nextReview = nextReview;

    // Update study cards
    const updatedStudyCards = [...studyCards];
    updatedStudyCards[currentIndex] = updatedCard;
    setStudyCards(updatedStudyCards);

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      correct: prev.correct + (isCorrect ? 1 : 0),
      incorrect: prev.incorrect + (isCorrect ? 0 : 1)
    }));

    // Move to next card
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      // Study session complete
      handleComplete();
    }
  }, [currentCard, currentIndex, studyCards, totalCards]);

  const handleSkip = useCallback(() => {
    setSessionStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
    
    if (currentIndex < totalCards - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
    } else {
      handleComplete();
    }
  }, [currentIndex, totalCards]);

  const handleComplete = useCallback(() => {
    const timeSpent = (Date.now() - startTime) / 1000 / 60; // minutes
    const totalResponses = sessionStats.correct + sessionStats.incorrect;
    const accuracy = totalResponses > 0 ? (sessionStats.correct / totalResponses) * 100 : 0;

    const results: StudyResults = {
      totalCards,
      newCards: studyCards.filter(card => card.status === 'new').length,
      learningCards: studyCards.filter(card => card.status === 'learning').length,
      knownCards: studyCards.filter(card => card.status === 'known').length,
      accuracy,
      timeSpent
    };

    onComplete?.(results);
  }, [startTime, sessionStats, totalCards, studyCards, onComplete]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'learning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'known': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (!currentCard) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <div className="space-y-4">
          <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
          <h2 className="text-2xl font-bold">Study Session Complete!</h2>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{sessionStats.correct}</div>
                <div className="text-sm text-gray-500">Correct</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{sessionStats.incorrect}</div>
                <div className="text-sm text-gray-500">Incorrect</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">{sessionStats.skipped}</div>
                <div className="text-sm text-gray-500">Skipped</div>
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                Accuracy: {sessionStats.correct + sessionStats.incorrect > 0 
                  ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
                  : 0}%
              </div>
            </div>
          </div>
        </div>
        <div className="flex space-x-4 justify-center">
          <Button onClick={() => window.location.reload()} variant="outline">
            <RotateCcw className="w-4 h-4 mr-2" />
            Study Again
          </Button>
          <Button onClick={onExit}>
            Finish Session
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Brain className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">Study Mode</h2>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              {currentIndex + 1} of {totalCards}
            </span>
            <Button variant="outline" size="sm" onClick={onExit}>
              Exit Study
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div className="space-y-1">
            <div className="text-green-600 font-semibold">{sessionStats.correct}</div>
            <div className="text-gray-500">Correct</div>
          </div>
          <div className="space-y-1">
            <div className="text-red-600 font-semibold">{sessionStats.incorrect}</div>
            <div className="text-gray-500">Incorrect</div>
          </div>
          <div className="space-y-1">
            <div className="text-gray-600 font-semibold">{sessionStats.skipped}</div>
            <div className="text-gray-500">Skipped</div>
          </div>
        </div>
      </div>

      {/* Flashcard */}
      <Card className="min-h-96">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2">
            <Badge className={getStatusColor(currentCard.status)}>
              {currentCard.status}
            </Badge>
            {currentCard.topic && (
              <Badge variant="secondary">{currentCard.topic}</Badge>
            )}
            {currentCard.difficulty && (
              <Badge className={getDifficultyColor(currentCard.difficulty)}>
                {currentCard.difficulty}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Question:</h3>
            <p className="text-base leading-relaxed">{currentCard.question}</p>
          </div>
          
          {showAnswer ? (
            <div className="space-y-6 border-t pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-600">Answer:</h3>
                <div className="text-base leading-relaxed whitespace-pre-wrap">
                  {currentCard.answer}
                </div>
              </div>
              
              {/* Response Buttons */}
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => handleResponse(false)}
                  variant="outline"
                  className="flex items-center text-red-600 border-red-300 hover:bg-red-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Incorrect
                </Button>
                <Button
                  onClick={handleSkip}
                  variant="outline"
                  className="flex items-center"
                >
                  Skip
                </Button>
                <Button
                  onClick={() => handleResponse(true)}
                  className="flex items-center bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Correct
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={() => setShowAnswer(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Show Answer
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Card Info */}
      {currentCard.reviewCount > 0 && (
        <div className="text-center text-sm text-gray-500 space-y-1">
          <div>Reviews: {currentCard.reviewCount} | Accuracy: {
            currentCard.reviewCount > 0 
              ? Math.round((currentCard.correctCount / currentCard.reviewCount) * 100)
              : 0
          }%</div>
          {currentCard.nextReview && (
            <div>Next review: {currentCard.nextReview.toLocaleDateString()}</div>
          )}
        </div>
      )}
    </div>
  );
}