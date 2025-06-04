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
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  cardCount: number;
  createdAt: string;
  updatedAt: string;
  apiProvider: string;
  previewCards: FlashcardPair[];
  hasFlashcards: boolean;
}

interface StudyProgress {
  cardIndex: number;
  status: 'known' | 'unknown' | 'reviewing';
  difficultyRating: 'easy' | 'medium' | 'hard';
  lastReviewedAt: string;
}

export default function StudyMain() {
  const { user } = useFirebaseAuth();
  const { toast } = useToast();
  
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

  // Fetch flashcard decks
  const { data: decks = [], isLoading: isLoadingDecks } = useQuery<FlashcardDeck[]>({
    queryKey: ["/api/decks"],
    enabled: !!user,
  });

  // Load flashcards for selected deck
  const loadDeckFlashcards = async (deck: FlashcardDeck) => {
    try {
      const response = await apiRequest("GET", `/api/jobs/${deck.id}`);
      const jobData = await response.json();
      
      if (jobData.flashcards) {
        const rawFlashcards = JSON.parse(jobData.flashcards);
        
        // Map the database format to frontend format
        const flashcards = rawFlashcards.map((card: any) => ({
          id: card.id,
          front: card.question || card.front || "No question available",
          back: card.answer || card.back || "No answer available", 
          subject: card.topic || card.subject || deck.subject,
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
  };

  // Markdown renderer component
  const MarkdownRenderer = ({ content }: { content: string }) => {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              return match ? (
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
                <Button onClick={() => window.location.href = '/upload'}>
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
                          {deck.cardCount} cards
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(deck.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Zap className="w-4 h-4" />
                          {deck.apiProvider}
                        </span>
                      </div>

                      <div className="pt-2">
                        <Button 
                          onClick={() => loadDeckFlashcards(deck)}
                          className="w-full group-hover:bg-blue-600"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Studying
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

  // Study Mode - Flashcard View
  if (studyMode === 'study' && selectedDeck && currentFlashcards.length > 0) {
    const currentCard = currentFlashcards[currentCardIndex];
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Study Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {selectedDeck.name}
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
                onClick={() => setStudyMode('edit')}
                size="sm"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
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

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Card {currentCardIndex + 1} of {currentFlashcards.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(((currentCardIndex + 1) / currentFlashcards.length) * 100)}% complete
              </span>
            </div>
            <Progress 
              value={((currentCardIndex + 1) / currentFlashcards.length) * 100} 
              className="h-2"
            />
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
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAnswer ? 'Hide Answer' : 'Show Answer'}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                <MarkdownRenderer 
                  content={showAnswer ? currentCard.back : currentCard.front} 
                />
                
                {currentCard.subject && (
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Badge variant="secondary">{currentCard.subject}</Badge>
                    {currentCard.difficulty && (
                      <Badge className={getDifficultyColor(currentCard.difficulty)}>
                        {currentCard.difficulty}
                      </Badge>
                    )}
                    {currentCard.tags && currentCard.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={previousCard}
                disabled={currentCardIndex === 0}
                size="sm"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              
              <Button
                variant="outline"
                onClick={nextCard}
                disabled={currentCardIndex === currentFlashcards.length - 1}
                size="sm"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              
              <Button
                variant="outline"
                onClick={resetStudy}
                size="sm"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>

            {/* Study Actions */}
            {showAnswer && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
                  How well did you know this?
                </span>
                <Button variant="outline" size="sm" className="text-red-600">
                  <XCircle className="w-4 h-4 mr-1" />
                  Hard
                </Button>
                <Button variant="outline" size="sm" className="text-yellow-600">
                  Medium
                </Button>
                <Button variant="outline" size="sm" className="text-green-600">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Easy
                </Button>
              </div>
            )}
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