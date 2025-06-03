import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { FlashcardPair } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { AuthModal } from "@/components/auth-modal";
import { FlashcardEditor } from "@/components/flashcard-editor";
import { StudyMode } from "@/components/study-mode";
import {
  Upload, FileText, Brain, Zap, Download, LoaderPinwheel, CheckCircle, AlertCircle, 
  Info, Lightbulb, Star, ExternalLink, User, LogOut, Play, Edit
} from "lucide-react";

export default function Home() {
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [cardCount, setCardCount] = useState("25");
  const [previewFlashcards, setPreviewFlashcards] = useState<FlashcardPair[]>([]);
  const [showAllFlashcards, setShowAllFlashcards] = useState(false);
  const [allFlashcards, setAllFlashcards] = useState<FlashcardPair[]>([]);
  const [currentView, setCurrentView] = useState<'upload' | 'edit' | 'study'>('upload');
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Focus areas state
  const [focusAreas, setFocusAreas] = useState({
    concepts: true,
    definitions: true,
    examples: false,
    procedures: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token with backend
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
      });
    }
  }, []);

  // Queries and mutations
  const { data: jobStatus } = useQuery({
    queryKey: ['/api/jobs', currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (data: any) => {
      return data?.status === 'processing' ? 2000 : false;
    },
  }) as { data: any };

  // Update flashcards when job completes
  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobStatus?.flashcards) {
      try {
        const flashcards = JSON.parse(jobStatus.flashcards);
        setAllFlashcards(flashcards);
        setPreviewFlashcards(flashcards.slice(0, 3));
        setCurrentStep(4);
      } catch (error) {
        console.error('Error parsing flashcards:', error);
      }
    }
  }, [jobStatus]);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {},
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setCurrentStep(3);
      toast({
        title: "Upload successful!",
        description: "Your PDF is being processed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await fetch(`/api/download/${jobId}`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'flashcards.apkg';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: "Download complete!",
        description: "Your Anki deck has been downloaded.",
      });
    },
  });

  // Event handlers
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setCurrentStep(2);
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('subject', subject);
    formData.append('difficulty', difficulty);
    formData.append('cardCount', cardCount);
    formData.append('focusAreas', JSON.stringify(focusAreas));

    uploadMutation.mutate(formData);
  }, [selectedFile, subject, difficulty, cardCount, focusAreas, uploadMutation]);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    toast({
      title: "Logged out",
      description: "You have been successfully logged out.",
    });
  };

  // Helper functions
  const getStepIndicatorClass = (step: number) => {
    const baseClass = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold";
    if (step < currentStep) {
      return `${baseClass} bg-green-500 text-white`;
    } else if (step === currentStep) {
      return `${baseClass} bg-blue-500 text-white`;
    } else {
      return `${baseClass} bg-gray-200 dark:bg-gray-700 text-gray-500`;
    }
  };

  const getProgressWidth = (step: number) => {
    return step < currentStep ? "100%" : "0%";
  };

  if (currentView === 'edit' && allFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Edit Your Flashcards</h2>
              <Button variant="outline" onClick={() => setCurrentView('upload')}>
                Back to Main
              </Button>
            </div>
            <FlashcardEditor
              flashcards={allFlashcards}
              onFlashcardsChange={setAllFlashcards}
            />
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'study' && allFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Study Mode</h2>
              <Button variant="outline" onClick={() => setCurrentView('upload')}>
                Back to Main
              </Button>
            </div>
            <StudyMode
              flashcards={allFlashcards}
              onExit={() => setCurrentView('upload')}
              onComplete={(results) => {
                toast({
                  title: "Study session complete!",
                  description: `Accuracy: ${Math.round(results.accuracy)}% • Time: ${Math.round(results.timeSpent)} minutes`,
                });
                setCurrentView('upload');
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral dark:text-white">StudyCards AI</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Transform any educational PDF into interactive Anki flashcards</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-neutral dark:text-white">{user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.plan === 'free' ? `${user.monthly_uploads}/3 uploads this month` : 'Pro Plan'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setShowAuthModal(true)}>
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Steps */}
            <div className="mb-12">
              <div className="flex items-center justify-center space-x-4 md:space-x-8">
                <div className="flex items-center">
                  <div className={getStepIndicatorClass(1)}>1</div>
                  <span className={`ml-2 text-sm font-medium ${currentStep >= 1 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Upload PDF</span>
                </div>
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full max-w-20">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: getProgressWidth(2) }}></div>
                </div>
                <div className="flex items-center">
                  <div className={getStepIndicatorClass(2)}>2</div>
                  <span className={`ml-2 text-sm font-medium ${currentStep >= 2 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Configure</span>
                </div>
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full max-w-20">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: getProgressWidth(3) }}></div>
                </div>
                <div className="flex items-center">
                  <div className={getStepIndicatorClass(3)}>3</div>
                  <span className={`ml-2 text-sm font-medium ${currentStep >= 3 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Generate</span>
                </div>
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full max-w-20">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: getProgressWidth(4) }}></div>
                </div>
                <div className="flex items-center">
                  <div className={getStepIndicatorClass(4)}>4</div>
                  <span className={`ml-2 text-sm font-medium ${currentStep >= 4 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Download</span>
                </div>
              </div>
            </div>

            {/* Step 1: File Upload */}
            <Card className="animate-slide-up">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-blue-500 text-white rounded-lg p-2 mr-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral dark:text-white">Upload Your Educational PDF</h2>
                </div>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <FileText className="w-12 h-12 text-gray-400 mb-4" />
                      <p className="text-lg font-medium text-neutral dark:text-white mb-2">
                        {selectedFile ? selectedFile.name : "Choose a PDF file"}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload textbooks, notes, or any educational material
                      </p>
                    </div>
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">File selected: {selectedFile.name}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Configuration */}
            {currentStep >= 2 && (
              <Card className="animate-slide-up">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-purple-500 text-white rounded-lg p-2 mr-3">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-neutral dark:text-white">Configure Your Flashcards</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject Area</Label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="computer-science">Computer Science</SelectItem>
                          <SelectItem value="mathematics">Mathematics</SelectItem>
                          <SelectItem value="physics">Physics</SelectItem>
                          <SelectItem value="chemistry">Chemistry</SelectItem>
                          <SelectItem value="biology">Biology</SelectItem>
                          <SelectItem value="medicine">Medicine</SelectItem>
                          <SelectItem value="psychology">Psychology</SelectItem>
                          <SelectItem value="history">History</SelectItem>
                          <SelectItem value="literature">Literature</SelectItem>
                          <SelectItem value="economics">Economics</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardCount">Number of Cards</Label>
                      <Select value={cardCount} onValueChange={setCardCount}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 cards</SelectItem>
                          <SelectItem value="25">25 cards</SelectItem>
                          <SelectItem value="35">35 cards</SelectItem>
                          <SelectItem value="50">50 cards</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Focus Areas</Label>
                      <div className="space-y-2">
                        {Object.entries(focusAreas).map(([key, value]) => (
                          <div key={key} className="flex items-center space-x-2">
                            <Checkbox
                              id={key}
                              checked={value}
                              onCheckedChange={(checked) =>
                                setFocusAreas(prev => ({ ...prev, [key]: checked }))
                              }
                            />
                            <Label htmlFor={key} className="capitalize">
                              {key}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || !subject || uploadMutation.isPending}
                    className="w-full mt-6"
                    size="lg"
                  >
                    {uploadMutation.isPending ? (
                      <LoaderPinwheel className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Brain className="w-5 h-5 mr-2" />
                    )}
                    Generate Flashcards
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Processing */}
            {currentStep >= 3 && jobStatus && (
              <Card className="animate-slide-up">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-orange-500 text-white rounded-lg p-2 mr-3">
                      <LoaderPinwheel className="w-5 h-5 animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold text-neutral dark:text-white">Processing Your PDF</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-neutral dark:text-white">Progress</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round((jobStatus.progress || 0) * 100)}%
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((jobStatus.progress || 0) * 100)}%` }}
                      ></div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {jobStatus.currentTask || "Processing..."}
                    </p>

                    {jobStatus.status === 'failed' && (
                      <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                          <p className="text-sm font-medium text-red-700 dark:text-red-300">Processing Failed</p>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{jobStatus.errorMessage}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Download and Preview */}
            {currentStep >= 4 && jobStatus?.status === 'completed' && (
              <Card className="animate-slide-up">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-green-500 text-white rounded-lg p-2 mr-3">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-neutral dark:text-white">Flashcards Ready!</h2>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                          <div>
                            <p className="font-medium text-green-700 dark:text-green-300">Generation Complete</p>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              Created {JSON.parse(jobStatus.flashcards || '[]').length} flashcards
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button 
                          onClick={() => setCurrentView('edit')}
                          variant="outline"
                          className="flex items-center justify-center"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Cards
                        </Button>
                        <Button 
                          onClick={() => setCurrentView('study')}
                          variant="outline"
                          className="flex items-center justify-center"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Study Mode
                        </Button>
                        <Button 
                          onClick={() => downloadMutation.mutate(currentJobId!)}
                          disabled={downloadMutation.isPending}
                          className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center"
                        >
                          {downloadMutation.isPending ? (
                            <LoaderPinwheel className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4 mr-2" />
                          )}
                          Download
                        </Button>
                      </div>

                      {/* Additional Export Options */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/api/export/${currentJobId}/csv`, '_blank')}
                          className="text-xs"
                        >
                          CSV
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/api/export/${currentJobId}/json`, '_blank')}
                          className="text-xs"
                        >
                          JSON
                        </Button>
                        <Button 
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/api/export/${currentJobId}/quizlet`, '_blank')}
                          className="text-xs"
                        >
                          Quizlet
                        </Button>
                      </div>
                    </div>

                    {/* Flashcard Preview */}
                    {previewFlashcards.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-neutral dark:text-white mb-4">Preview Flashcards</h3>
                        <div className="space-y-3">
                          {(showAllFlashcards ? JSON.parse(jobStatus.flashcards || '[]') : previewFlashcards).map((card: FlashcardPair, index: number) => (
                            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Question {index + 1}</span>
                                  {card.topic && (
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                      {card.topic}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-900 dark:text-gray-100">{card.question}</p>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-green-600 dark:text-green-400 block mb-1">Answer</span>
                                <div className="bg-gray-900 dark:bg-gray-950 text-green-400 p-3 rounded font-mono text-sm whitespace-pre-wrap">
                                  {card.answer}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {!showAllFlashcards && JSON.parse(jobStatus.flashcards || '[]').length > 3 && (
                          <Button 
                            variant="outline" 
                            onClick={() => setShowAllFlashcards(true)}
                            className="mt-4 w-full"
                          >
                            Show All {JSON.parse(jobStatus.flashcards || '[]').length} Flashcards
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Info Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Info className="w-5 h-5 text-blue-500 mr-2" />
                    <h3 className="font-semibold text-neutral dark:text-white">How it works</h3>
                  </div>
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">1</div>
                      <p>Upload any educational PDF (textbooks, notes, study guides)</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</div>
                      <p>AI analyzes content and identifies key concepts in your subject area</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</div>
                      <p>Smart flashcards are generated with definitions, examples, and explanations</p>
                    </div>
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">4</div>
                      <p>Download as Anki deck for spaced repetition learning</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Lightbulb className="w-5 h-5 text-yellow-500 mr-2" />
                    <h3 className="font-semibold text-neutral dark:text-white">Tips for better results</h3>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                      <p>Choose the correct subject area for optimal results</p>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                      <p>Use PDFs with clear examples and explanations</p>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                      <p>Focus on concepts and definitions for core learning</p>
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                      <p>Start with 25 flashcards to avoid overwhelm</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Support Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <ExternalLink className="w-5 h-5 text-green-500 mr-2" />
                    <h3 className="font-semibold text-neutral dark:text-white">Need help?</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Get support with your flashcard generation or learn advanced study techniques.
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Help Center
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user, token) => {
          setUser(user);
          localStorage.setItem('auth_token', token);
        }}
      />
    </div>
  );
}