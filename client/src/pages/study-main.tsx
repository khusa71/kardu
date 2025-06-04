import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NavigationBar } from "@/components/navigation-bar";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Link } from "wouter";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import { BookOpen, ChevronLeft, ChevronRight, RotateCcw, CheckCircle, XCircle, Eye, EyeOff, Play, FileText, Edit3, Save, X, Grid, List } from "lucide-react";

interface FlashcardJob {
  id: number;
  filename: string;
  fileSize: number;
  subject: string;
  difficulty: string;
  status: string;
  progress: number;
  flashcardCount: number;
  apiProvider: string;
  createdAt: string;
  updatedAt: string;
  processingTime: number;
  flashcards: string | FlashcardPair[];
}

interface FlashcardPair {
  id?: number;
  front: string;
  back: string;
  subject?: string;
  difficulty?: string;
  tags?: string[];
}

interface StudyProgress {
  cardIndex: number;
  status: 'known' | 'unknown' | 'reviewing';
  difficultyRating: 'easy' | 'medium' | 'hard';
  lastReviewedAt: string;
}

export default function StudyMain() {
  const { user, loading } = useFirebaseAuth();
  const { toast } = useToast();
  
  // Study state
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studyProgress, setStudyProgress] = useState<{[key: number]: 'easy' | 'medium' | 'hard'}>({});
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [currentFlashcards, setCurrentFlashcards] = useState<FlashcardPair[]>([]);
  
  // Edit state
  const [editingCardIndex, setEditingCardIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FlashcardPair>({ front: '', back: '' });
  
  // View state
  const [viewMode, setViewMode] = useState<'grid' | 'study'>('grid');

  // Fetch user jobs for study selection
  const { data: userJobs = [], isLoading } = useQuery<FlashcardJob[]>({
    queryKey: ["/api/history"],
    enabled: !!user,
  });

  // Get completed jobs with flashcards
  const completedJobs = userJobs.filter(job => {
    // Check if job is completed and has flashcards
    if (job.status !== 'completed') return false;
    if (!job.flashcards) return false;
    
    // Handle both string and array formats
    if (typeof job.flashcards === 'string') {
      try {
        const parsed = JSON.parse(job.flashcards);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    }
    
    return Array.isArray(job.flashcards) && job.flashcards.length > 0;
  });

  // Mutation for updating flashcards
  const updateFlashcardMutation = useMutation({
    mutationFn: async ({ jobId, flashcards }: { jobId: number; flashcards: FlashcardPair[] }) => {
      if (!user?.getIdToken) throw new Error('Authentication required');
      const token = await user.getIdToken();
      
      return fetch(`/api/jobs/${jobId}/flashcards`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ flashcards })
      });
    },
    onSuccess: () => {
      toast({
        title: "Flashcard updated",
        description: "Your changes have been saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update flashcard",
        variant: "destructive",
      });
    },
  });

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
      setViewMode('study');
    }
  };

  const navigateCard = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentCardIndex < currentFlashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else if (direction === 'prev' && currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setShowAnswer(false);
    }
  };

  const markDifficulty = (difficulty: 'easy' | 'medium' | 'hard') => {
    setStudyProgress(prev => ({
      ...prev,
      [currentCardIndex]: difficulty
    }));
    
    // Auto-advance to next card after a short delay
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

  // Edit functionality
  const startEditing = (cardIndex: number) => {
    setEditingCardIndex(cardIndex);
    setEditForm(currentFlashcards[cardIndex]);
  };

  const cancelEditing = () => {
    setEditingCardIndex(null);
    setEditForm({ front: '', back: '' });
  };

  const saveEdit = () => {
    if (editingCardIndex === null || !selectedJobId) return;
    
    const updatedFlashcards = [...currentFlashcards];
    updatedFlashcards[editingCardIndex] = editForm;
    
    setCurrentFlashcards(updatedFlashcards);
    updateFlashcardMutation.mutate({ jobId: selectedJobId, flashcards: updatedFlashcards });
    cancelEditing();
  };

  // Markdown renderer with syntax highlighting
  const MarkdownRenderer = ({ content }: { content: string }) => (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return isInline ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <pre className="bg-gray-900 text-gray-100 rounded-md p-4 overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span>Loading...</span>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Please sign in to access your study materials.
            </p>
            <Link href="/upload">
              <Button>Sign In</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Grid view of all flashcard sets
  if (viewMode === 'grid') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Study Hub</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Review, edit, and study your flashcard collections
              </p>
            </div>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <Button variant="outline" onClick={() => setViewMode('grid')} className="bg-white dark:bg-gray-800">
                <Grid className="w-4 h-4 mr-2" />
                Grid View
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span>Loading your flashcard collections...</span>
            </div>
          ) : completedJobs.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-20 h-20 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                No flashcards found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Start creating flashcards by uploading educational PDFs. Once processed, they'll appear here for study and review.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/upload">
                  <Button size="lg">
                    <FileText className="w-4 h-4 mr-2" />
                    Upload Your First PDF
                  </Button>
                </Link>
                <Link href="/history">
                  <Button variant="outline" size="lg">
                    View Upload History
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <BookOpen className="w-8 h-8 text-blue-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sets</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedJobs.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <FileText className="w-8 h-8 text-green-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Cards</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {completedJobs.reduce((sum, job) => sum + (job.flashcardCount || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <CheckCircle className="w-8 h-8 text-purple-500 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ready to Study</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedJobs.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Flashcard Collections Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedJobs.map((job) => {
                  const flashcardCount = job.flashcardCount || 0;
                  const createdDate = new Date(job.createdAt).toLocaleDateString();
                  
                  return (
                    <Card key={job.id} className="group hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200 dark:hover:border-blue-800">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {job.filename.replace('.pdf', '')}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Created {createdDate}
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-2 flex-shrink-0">
                            {job.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-1" />
                              {flashcardCount} cards
                            </div>
                            <div className="capitalize">{job.subject || 'General'}</div>
                            <div className="capitalize">{job.difficulty || 'Medium'}</div>
                          </div>
                          
                          {/* Progress bar placeholder */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600 dark:text-gray-400">Study Progress</span>
                              <span className="text-gray-600 dark:text-gray-400">0%</span>
                            </div>
                            <Progress value={0} className="h-2" />
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button 
                              className="flex-1"
                              onClick={() => loadJobFlashcards(job)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Study
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => loadJobFlashcards(job)}
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Study interface with editing capabilities
  const currentCard = currentFlashcards[currentCardIndex];
  const progressPercentage = Math.round(((currentCardIndex + 1) / currentFlashcards.length) * 100);
  const studiedCards = Object.keys(studyProgress).length;
  const selectedJob = completedJobs.find(job => job.id === selectedJobId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavigationBar />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Study Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div className="flex items-center gap-4 mb-4 sm:mb-0">
              <Button variant="outline" onClick={() => setViewMode('grid')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Hub
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedJob?.filename.replace('.pdf', '') || 'Flashcard Study'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedJob?.subject || 'General'} • {selectedJob?.difficulty || 'Medium'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={resetProgress} size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={() => setViewMode('grid')} size="sm">
                <Grid className="w-4 h-4 mr-2" />
                Grid View
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Card {currentCardIndex + 1} of {currentFlashcards.length}</span>
              <span className="text-gray-600 dark:text-gray-400">{progressPercentage}% Complete</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Studied: {studiedCards}</span>
              <span>Remaining: {currentFlashcards.length - studiedCards}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Flashcard Area */}
          <div className="lg:col-span-2">
            {/* Flashcard */}
            <Card className="mb-6 min-h-[400px]">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {showAnswer ? 'Answer' : 'Question'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(currentCardIndex)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-8">
                {editingCardIndex === currentCardIndex ? (
                  /* Edit Mode */
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Question (Front)</label>
                        <Textarea
                          value={editForm.front}
                          onChange={(e) => setEditForm({ ...editForm, front: e.target.value })}
                          rows={6}
                          className="w-full"
                          placeholder="Enter the question or prompt..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Answer (Back)</label>
                        <Textarea
                          value={editForm.back}
                          onChange={(e) => setEditForm({ ...editForm, back: e.target.value })}
                          rows={6}
                          className="w-full"
                          placeholder="Enter the answer or explanation..."
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Subject</label>
                        <Input
                          value={editForm.subject || ''}
                          onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                          placeholder="e.g., Programming"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Difficulty</label>
                        <Select
                          value={editForm.difficulty || ''}
                          onValueChange={(value) => setEditForm({ ...editForm, difficulty: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Tags</label>
                        <Input
                          value={editForm.tags?.join(', ') || ''}
                          onChange={(e) => setEditForm({ 
                            ...editForm, 
                            tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                          })}
                          placeholder="e.g., loops, arrays, functions"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={cancelEditing}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button 
                        onClick={saveEdit}
                        disabled={updateFlashcardMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateFlashcardMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Study Mode */
                  <div className="text-center min-h-[300px] flex flex-col justify-center">
                    <div className="mb-8">
                      <div className="max-w-3xl mx-auto">
                        <MarkdownRenderer 
                          content={showAnswer ? currentCard.back : currentCard.front} 
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setShowAnswer(!showAnswer)}
                        size="lg"
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
                      
                      {currentCard.tags && currentCard.tags.length > 0 && (
                        <div className="flex items-center gap-2 ml-4">
                          {currentCard.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation Controls */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => navigateCard('prev')}
                disabled={currentCardIndex === 0}
                size="lg"
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
                size="lg"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Sidebar Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Study Progress Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Study Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{studiedCards}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cards Studied</div>
                </div>
                
                <Progress value={(studiedCards / currentFlashcards.length) * 100} className="h-2" />
                
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="font-semibold text-green-600">
                      {Object.values(studyProgress).filter(p => p === 'easy').length}
                    </div>
                    <div className="text-gray-500">Easy</div>
                  </div>
                  <div>
                    <div className="font-semibold text-yellow-600">
                      {Object.values(studyProgress).filter(p => p === 'medium').length}
                    </div>
                    <div className="text-gray-500">Medium</div>
                  </div>
                  <div>
                    <div className="font-semibold text-red-600">
                      {Object.values(studyProgress).filter(p => p === 'hard').length}
                    </div>
                    <div className="text-gray-500">Hard</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Rating */}
            {showAnswer && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-center">How well did you know this?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3">
                    <Button
                      variant={studyProgress[currentCardIndex] === 'easy' ? 'default' : 'outline'}
                      onClick={() => markDifficulty('easy')}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Easy
                    </Button>
                    <Button
                      variant={studyProgress[currentCardIndex] === 'medium' ? 'default' : 'outline'}
                      onClick={() => markDifficulty('medium')}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white"
                    >
                      Medium
                    </Button>
                    <Button
                      variant={studyProgress[currentCardIndex] === 'hard' ? 'default' : 'outline'}
                      onClick={() => markDifficulty('hard')}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Hard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Card Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {currentFlashcards.map((_, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded text-sm cursor-pointer transition-colors ${
                        index === currentCardIndex
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-300'
                          : studyProgress[index]
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200'
                      } border`}
                      onClick={() => {
                        setCurrentCardIndex(index);
                        setShowAnswer(false);
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <span>Card {index + 1}</span>
                        {studyProgress[index] && (
                          <Badge
                            variant="secondary"
                            className={
                              studyProgress[index] === 'easy'
                                ? 'bg-green-100 text-green-800'
                                : studyProgress[index] === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {studyProgress[index]}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}