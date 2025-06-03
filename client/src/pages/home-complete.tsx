import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Brain, FileText, Settings, Download, Upload, ChevronDown, CheckCircle, Clock, LoaderPinwheel, Check, Lightbulb, Star, HelpCircle, ExternalLink, Shield, ShieldCheck, Info, AlertCircle, RotateCcw, Edit, Play, User, LogOut, TrendingUp } from "lucide-react";
import type { FlashcardJob, FlashcardPair } from "@shared/schema";
import { FlashcardEditor } from "@/components/flashcard-editor";
import { StudyMode } from "@/components/study-mode";
import { AuthModal } from "@/components/auth-modal";

export default function Home() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiProvider, setApiProvider] = useState<"openai" | "anthropic">("anthropic");
  const [flashcardCount, setFlashcardCount] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Subject and focus areas
  const [subject, setSubject] = useState<string>("programming");
  const [focusAreas, setFocusAreas] = useState({
    concepts: true,
    definitions: true,
    examples: false,
    procedures: false,
  });
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  
  // Processing state
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [previewFlashcards, setPreviewFlashcards] = useState<FlashcardPair[]>([]);
  const [showAllFlashcards, setShowAllFlashcards] = useState(false);
  const [currentView, setCurrentView] = useState<'upload' | 'edit' | 'study'>('upload');
  const [allFlashcards, setAllFlashcards] = useState<FlashcardPair[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check for stored auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // Verify token and get user info
      fetch('/api/auth/me', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
        .then(res => res.json())
        .then(userData => setUser(userData))
        .catch(() => localStorage.removeItem('auth_token'));
    }
  }, []);

  // Poll for job status
  const { data: jobStatus } = useQuery({
    queryKey: ['/api/jobs', currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      const status = (data as any)?.status;
      return status === 'completed' || status === 'failed' ? false : 2000;
    },
  });

  // Update flashcards when job completes
  useEffect(() => {
    const job = jobStatus as any;
    if (job?.status === 'completed' && job.flashcards) {
      const flashcards = JSON.parse(job.flashcards);
      setAllFlashcards(flashcards);
      setPreviewFlashcards(flashcards.slice(0, 3));
      setCurrentStep(4);
    }
  }, [jobStatus]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: user ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` } : {}
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setCurrentStep(2);
      toast({
        title: "Upload successful!",
        description: "Processing your PDF...",
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

  // Download mutation
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
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download complete!",
        description: "Anki deck saved to your downloads",
      });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a PDF smaller than 10MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setCurrentStep(1);
  }, [toast]);

  const handleSubmit = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file first",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('subject', subject);
    formData.append('flashcardCount', flashcardCount.toString());
    formData.append('difficulty', difficulty);
    formData.append('apiProvider', apiProvider);
    formData.append('focusAreas', JSON.stringify(focusAreas));

    uploadMutation.mutate(formData);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const getStepIndicatorClass = (step: number) => {
    if (currentStep > step) {
      return "w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium";
    } else if (currentStep === step) {
      return "w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium";
    } else {
      return "w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center text-sm font-medium";
    }
  };

  const getProgressPercentage = () => {
    if (!jobStatus) return 0;
    const job = jobStatus as any;
    if (job?.status === 'completed') return 100;
    if (job?.status === 'failed') return 0;
    return job?.progress || 0;
  };

  // Edit View Component
  const EditView = () => (
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
  );

  // Study View Component
  const StudyView = () => (
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
  );

  // Main Upload View Component
  const UploadView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-8">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4 md:space-x-8">
            <div className="flex items-center">
              <div className={getStepIndicatorClass(1)}>1</div>
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">Upload PDF</span>
            </div>
            <div className="w-8 md:w-16 h-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(2)}>2</div>
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">Configure</span>
            </div>
            <div className="w-8 md:w-16 h-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(3)}>3</div>
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">Generate</span>
            </div>
            <div className="w-8 md:w-16 h-px bg-gray-300 dark:bg-gray-600"></div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(4)}>4</div>
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">Download</span>
            </div>
          </div>
        </div>

        {/* Step 1: File Upload */}
        <Card className="animate-slide-up">
          <CardContent className="p-8">
            <div className="flex items-center mb-6">
              <div className="bg-blue-500 text-white rounded-lg p-2 mr-3">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-neutral dark:text-white">Upload Your PDF</h2>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Drop your PDF here or click to browse
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Supports textbooks, notes, study guides (max 10MB)
              </p>
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="mb-4"
              >
                Choose File
              </Button>
              
              {selectedFile && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  </div>
                </div>
              )}
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                accept=".pdf"
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Configuration */}
        {currentStep >= 2 && (
          <Card className="animate-slide-up">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-purple-500 text-white rounded-lg p-2 mr-3">
                  <Settings className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-neutral dark:text-white">Configure Generation</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Subject Area
                    </Label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="programming">Programming & Computer Science</SelectItem>
                        <SelectItem value="mathematics">Mathematics</SelectItem>
                        <SelectItem value="physics">Physics</SelectItem>
                        <SelectItem value="chemistry">Chemistry</SelectItem>
                        <SelectItem value="biology">Biology</SelectItem>
                        <SelectItem value="history">History</SelectItem>
                        <SelectItem value="literature">Literature</SelectItem>
                        <SelectItem value="psychology">Psychology</SelectItem>
                        <SelectItem value="economics">Economics</SelectItem>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="law">Law</SelectItem>
                        <SelectItem value="general">General Studies</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="flashcardCount" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Number of Flashcards: {flashcardCount}
                    </Label>
                    <input
                      type="range"
                      id="flashcardCount"
                      min="10"
                      max="100"
                      step="5"
                      value={flashcardCount}
                      onChange={(e) => setFlashcardCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10</span>
                      <span>100</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="difficulty" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Difficulty Level
                    </Label>
                    <Select value={difficulty} onValueChange={(value: "beginner" | "intermediate" | "advanced") => setDifficulty(value)}>
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
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
                      Focus Areas
                    </Label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="concepts"
                          checked={focusAreas.concepts}
                          onCheckedChange={(checked) => 
                            setFocusAreas(prev => ({ ...prev, concepts: !!checked }))
                          }
                        />
                        <Label htmlFor="concepts" className="text-sm">Key concepts and theories</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="definitions"
                          checked={focusAreas.definitions}
                          onCheckedChange={(checked) => 
                            setFocusAreas(prev => ({ ...prev, definitions: !!checked }))
                          }
                        />
                        <Label htmlFor="definitions" className="text-sm">Definitions and terminology</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="examples"
                          checked={focusAreas.examples}
                          onCheckedChange={(checked) => 
                            setFocusAreas(prev => ({ ...prev, examples: !!checked }))
                          }
                        />
                        <Label htmlFor="examples" className="text-sm">Examples and case studies</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="procedures"
                          checked={focusAreas.procedures}
                          onCheckedChange={(checked) => 
                            setFocusAreas(prev => ({ ...prev, procedures: !!checked }))
                          }
                        />
                        <Label htmlFor="procedures" className="text-sm">Procedures and methods</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Advanced Options
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </Button>

                    {showAdvanced && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Label htmlFor="apiProvider" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          AI Provider
                        </Label>
                        <Select value={apiProvider} onValueChange={(value: "openai" | "anthropic") => setApiProvider(value)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anthropic">Claude (Anthropic) - Recommended</SelectItem>
                            <SelectItem value="openai">GPT-4 (OpenAI)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedFile || uploadMutation.isPending}
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <LoaderPinwheel className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Generate Flashcards
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Processing */}
        {currentStep >= 3 && jobStatus && (jobStatus as any)?.status !== 'completed' && (
          <Card className="animate-slide-up">
            <CardContent className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-yellow-500 text-white rounded-lg p-2 mr-3">
                  <Clock className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-neutral dark:text-white">Processing Your PDF</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {(jobStatus as any)?.currentTask || 'Processing...'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {Math.round(getProgressPercentage())}%
                    </span>
                  </div>
                  <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Text Extraction</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {(jobStatus as any)?.currentTask?.includes('OCR') ? 'OCR Processing' : 
                       (jobStatus as any)?.currentTask?.includes('extract') ? 'In Progress' : 'Completed'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Brain className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">AI Analysis</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                      {(jobStatus as any)?.currentTask?.includes('cache') ? 'Cache Hit' : 
                       (jobStatus as any)?.currentTask?.includes('AI') ? 'In Progress' : 
                       getProgressPercentage() > 50 ? 'In Progress' : 'Waiting'}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Flashcard Generation</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {getProgressPercentage() > 80 ? 'In Progress' : 'Waiting'}
                    </p>
                  </div>
                </div>

                {(jobStatus as any)?.status === 'failed' && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">Processing Failed</p>
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{(jobStatus as any)?.errorMessage}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Download and Preview */}
        {currentStep >= 4 && (jobStatus as any)?.status === 'completed' && (
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
                          Created {JSON.parse((jobStatus as any)?.flashcards || '[]').length} flashcards
                          {(jobStatus as any)?.currentTask?.includes('cache') && (
                            <span className="ml-2 text-blue-600">• Cached for efficiency</span>
                          )}
                          {(jobStatus as any)?.currentTask?.includes('OCR') && (
                            <span className="ml-2 text-orange-600">• OCR processed</span>
                          )}
                          {(jobStatus as any)?.currentTask?.includes('cost') && (
                            <span className="ml-2 text-purple-600">• Cost optimized</span>
                          )}
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

        {/* Help Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <HelpCircle className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-semibold text-neutral dark:text-white">Need help?</h3>
            </div>
            <div className="space-y-3">
              <Button variant="ghost" size="sm" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Examples
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help Center
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-neutral dark:text-white">StudyCards AI</h1>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">Transform any educational PDF into interactive Anki flashcards</p>
                </div>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Powered by AI</span>
              <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                <Shield className="w-3 h-3 mr-1 inline" />
                Secure
              </div>
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{user.email}</span>
                  <div className="text-xs text-gray-500">
                    {user.monthly_uploads}/{user.monthly_limit} uploads
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem('auth_token');
                      setUser(null);
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Management */}
        {currentView === 'edit' && allFlashcards.length > 0 && <EditView />}
        {currentView === 'study' && allFlashcards.length > 0 && <StudyView />}
        {currentView === 'upload' && <UploadView />}
      </main>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user, token) => {
          setUser(user);
          localStorage.setItem('auth_token', token);
          setShowAuthModal(false);
        }}
      />
    </div>
  );
}