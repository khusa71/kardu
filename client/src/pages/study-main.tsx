import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FlashcardPair } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavigationBar } from "@/components/navigation-bar";
import { FlashcardEditor } from "@/components/flashcard-editor";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle, Eye, EyeOff, Play, FileText, Edit3, Save, X, Grid, List, Calendar, User, Zap } from "lucide-react";

interface FlashcardDeck {
  id: number;
  name: string;
  filename: string;
  subject: string;
  difficulty: string;
  flashcardCount: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  previewCards: FlashcardPair[];
  hasFlashcards: boolean;
}

interface StudyProgress {
  cardIndex: number;
  status: 'known' | 'unknown' | 'reviewing';
  difficultyRating: 'easy' | 'medium' | 'hard';
  lastReviewedAt: string;
}

interface StudySession {
  deckId: number;
  cardRatings: { [cardIndex: number]: 'easy' | 'medium' | 'hard' };
  completedCards: number[];
}

export default function StudyMain() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // State management
  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentFlashcards, setCurrentFlashcards] = useState<FlashcardPair[]>([]);
  const [studyMode, setStudyMode] = useState<'browse' | 'study' | 'edit'>('browse');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [studySession, setStudySession] = useState<StudySession>({ deckId: 0, cardRatings: {}, completedCards: [] });

  // Fetch flashcard decks
  const { data: decks = [], isLoading: isLoadingDecks } = useQuery<FlashcardDeck[]>({
    queryKey: ["/api/decks"],
    enabled: !!user,
  });

  // Navigate to dedicated study page with proper session management
  const startStudySession = (deck: FlashcardDeck) => {
    if (deck.id) {
      setLocation(`/study/${deck.id}`);
    } else {
      toast({
        title: "Error",
        description: "Deck ID not found. Please refresh the page and try again.",
        variant: "destructive"
      });
    }
  };

  // Load flashcards for viewing (not studying)
  const loadDeckFlashcards = async (deck: FlashcardDeck) => {
    try {
      const jobData = await apiRequest("GET", `/api/jobs/${deck.id}`);
      
      if (jobData.flashcards && jobData.flashcards.length > 0) {
        // Flashcards are already in normalized format from the API
        const flashcards = jobData.flashcards.map((card: any) => ({
          id: card.id,
          front: card.front,
          back: card.back,
          subject: card.subject || deck.subject,
          difficulty: card.difficulty || deck.difficulty,
          tags: card.tags || []
        }));
        
        setCurrentFlashcards(flashcards);
        setSelectedDeck(deck);
        setStudyMode('study');
        setCurrentCardIndex(0);
        setShowAnswer(false);
      } else {
        toast({
          title: "No flashcards available",
          description: "This deck doesn't contain any flashcards.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to load flashcards",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter decks based on search and filters
  const filteredDecks = decks.filter((deck: FlashcardDeck) => {
    const matchesSearch = deck.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deck.subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === "all" || deck.subject === filterSubject;
    const matchesDifficulty = filterDifficulty === "all" || deck.difficulty === filterDifficulty;
    
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  // Get unique subjects and difficulties for filters
  const uniqueSubjects = Array.from(new Set(decks.map((deck: FlashcardDeck) => deck.subject)));
  const uniqueDifficulties = Array.from(new Set(decks.map((deck: FlashcardDeck) => deck.difficulty)));

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Study mode navigation
  const nextCard = () => {
    if (currentCardIndex < currentFlashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    }
  };

  const previousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const resetStudy = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setStudySession({ deckId: selectedDeck?.id || 0, cardRatings: {}, completedCards: [] });
  };

  // Handle difficulty rating
  const handleDifficultyRating = (rating: 'easy' | 'medium' | 'hard') => {
    const newRatings = { ...studySession.cardRatings };
    newRatings[currentCardIndex] = rating;
    
    const newCompletedCards = [...studySession.completedCards];
    if (!newCompletedCards.includes(currentCardIndex)) {
      newCompletedCards.push(currentCardIndex);
    }
    
    setStudySession({
      ...studySession,
      cardRatings: newRatings,
      completedCards: newCompletedCards
    });
    
    // Auto-advance to next card after rating (no toast notification)
    setTimeout(() => {
      if (currentCardIndex < currentFlashcards.length - 1) {
        nextCard();
      }
    }, 300);
  };

  // Markdown renderer component
  const MarkdownRenderer = ({ content }: { content: string }) => {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
                <SyntaxHighlighter
                  style={tomorrow as any}
                  language={match[1]}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className}>
                  {children}
                </code>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  // Browse Mode - Deck Grid/List View
  if (studyMode === 'browse') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Study Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Review and practice with your flashcard collections
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Input
                  placeholder="Search decks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              
              <div>
                <Select value={filterSubject} onValueChange={setFilterSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All subjects</SelectItem>
                    {uniqueSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="All difficulties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All difficulties</SelectItem>
                    {uniqueDifficulties.map((difficulty) => (
                      <SelectItem key={difficulty} value={difficulty}>
                        {difficulty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex-1"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex-1"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoadingDecks && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading your flashcard decks...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoadingDecks && filteredDecks.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {decks.length === 0 ? "No flashcard decks yet" : "No decks match your filters"}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {decks.length === 0 
                  ? "Upload your first PDF to create flashcards and start studying"
                  : "Try adjusting your search terms or filters"
                }
              </p>
              {decks.length === 0 && (
                <Button onClick={() => setLocation('/upload')}>
                  Upload PDF
                </Button>
              )}
            </div>
          )}

          {/* Deck Grid/List */}
          {!isLoadingDecks && filteredDecks.length > 0 && (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {filteredDecks.map((deck: FlashcardDeck) => (
                <Card key={deck.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate mb-1">
                          {deck.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {deck.subject}
                          </Badge>
                          <Badge className={`${getDifficultyColor(deck.difficulty)} text-xs`}>
                            {deck.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {deck.flashcardCount} cards
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(deck.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {deck.status === 'completed' ? 'Ready' : 'Processing'}
                        </span>
                      </div>

                      <div className="pt-2 space-y-2">
                        <Button 
                          onClick={() => startStudySession(deck)}
                          className="w-full group-hover:bg-blue-600"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Studying
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => loadDeckFlashcards(deck)}
                          className="w-full"
                          size="sm"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Cards
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Study Mode - Minimal Mobile-First Design
  if (studyMode === 'study' && selectedDeck && currentFlashcards.length > 0) {
    const currentCard = currentFlashcards[currentCardIndex];
    const isCardRated = studySession.cardRatings[currentCardIndex];
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        
        {/* Minimal container */}
        <div className="max-w-lg mx-auto px-3 py-4">
          {/* Essential header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentCardIndex + 1} / {currentFlashcards.length}
            </span>
            <Button
              variant="outline"
              onClick={() => setStudyMode('browse')}
              size="sm"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress indicator */}
          <Progress 
            value={((currentCardIndex + 1) / currentFlashcards.length) * 100} 
            className="h-1 mb-4"
          />

          {/* Clean flashcard */}
          <Card className="mb-6 min-h-[70vh] flex flex-col">
            <CardContent className="flex-1 flex flex-col p-4">
              {/* Question - Always visible */}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Question</div>
                <div className="prose dark:prose-invert max-w-none prose-sm">
                  <MarkdownRenderer content={currentCard.front} />
                </div>
              </div>
              
              {/* Answer - Scrollable for long content */}
              {showAnswer && (
                <div className="flex-1 flex flex-col">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Answer</div>
                  <div className="flex-1 max-h-[45vh] overflow-y-auto rounded-lg p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <div className="prose dark:prose-invert max-w-none prose-sm">
                      <MarkdownRenderer content={currentCard.back} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show Answer Button */}
              {!showAnswer && (
                <div className="flex-1 flex items-center justify-center">
                  <Button
                    onClick={() => setShowAnswer(true)}
                    size="lg"
                    className="w-full max-w-xs"
                  >
                    Show Answer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating buttons - Only when answer is shown */}
          {showAnswer && (
            <div className="mb-4">
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  variant={isCardRated === 'hard' ? 'default' : 'outline'} 
                  size="sm" 
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleDifficultyRating('hard')}
                >
                  Hard
                </Button>
                <Button 
                  variant={isCardRated === 'medium' ? 'default' : 'outline'} 
                  size="sm" 
                  className="text-yellow-600 hover:text-yellow-700"
                  onClick={() => handleDifficultyRating('medium')}
                >
                  Medium
                </Button>
                <Button 
                  variant={isCardRated === 'easy' ? 'default' : 'outline'} 
                  size="sm" 
                  className="text-green-600 hover:text-green-700"
                  onClick={() => handleDifficultyRating('easy')}
                >
                  Easy
                </Button>
              </div>
            </div>
          )}

          {/* Simple navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={previousCard}
              disabled={currentCardIndex === 0}
              size="sm"
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            
            <Button
              variant="outline"
              onClick={nextCard}
              disabled={currentCardIndex === currentFlashcards.length - 1}
              size="sm"
              className="flex-1"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode - Flashcard Editor
  if (studyMode === 'edit' && selectedDeck && currentFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Edit Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Edit: {selectedDeck.name}
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selectedDeck.subject}</Badge>
                <Badge className={getDifficultyColor(selectedDeck.difficulty)}>
                  {selectedDeck.difficulty}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setStudyMode('study')}
                size="sm"
              >
                <Eye className="w-4 h-4 mr-2" />
                Study
              </Button>
              <Button
                variant="outline"
                onClick={() => setStudyMode('browse')}
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Exit
              </Button>
            </div>
          </div>

          {/* Flashcard Editor */}
          <FlashcardEditor
            flashcards={currentFlashcards}
            onFlashcardsChange={setCurrentFlashcards}
          />
        </div>
      </div>
    );
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavigationBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    </div>
  );
}