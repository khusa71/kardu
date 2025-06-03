import { useState, useRef, useCallback } from "react";
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
import { Brain, FileText, Settings, Download, Upload, Eye, EyeOff, ChevronDown, CheckCircle, Clock, LoaderPinwheel, Check, Key, Lightbulb, Star, HelpCircle, ExternalLink, Shield, ShieldCheck, Info, AlertCircle, RotateCcw, Edit, Play, User, LogOut } from "lucide-react";
import { FlashcardEditor } from "@/components/flashcard-editor";
import { StudyMode } from "@/components/study-mode";
import { AuthModal } from "@/components/auth-modal";
import type { FlashcardJob, FlashcardPair } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiProvider, setApiProvider] = useState<"openai" | "anthropic">("anthropic");
  const [flashcardCount, setFlashcardCount] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Advanced options
  const [focusAreas, setFocusAreas] = useState({
    syntax: true,
    dataStructures: true,
    controlFlow: false,
  });
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  
  // Processing state
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [previewFlashcards, setPreviewFlashcards] = useState<FlashcardPair[]>([]);
  const [showAllFlashcards, setShowAllFlashcards] = useState(false);
  const [allFlashcards, setAllFlashcards] = useState<FlashcardPair[]>([]);
  const [currentView, setCurrentView] = useState<'upload' | 'edit' | 'study'>('upload');
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Poll for job status
  const { data: jobStatus } = useQuery<FlashcardJob>({
    queryKey: ['/api/jobs', currentJobId],
    enabled: !!currentJobId,
    refetchInterval: currentJobId ? 2000 : false,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      setCurrentStep(3);
      toast({
        title: "Upload successful",
        description: "Your PDF is being processed...",
      });
    },
    onError: (error) => {
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
      const response = await apiRequest("GET", `/api/download/${jobId}`);
      const blob = await response.blob();
      return { blob, filename: response.headers.get('Content-Disposition')?.split('filename=')[1] || 'flashcards.apkg' };
    },
    onSuccess: ({ blob, filename }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download complete",
        description: "Your Anki deck has been downloaded!",
      });
    },
    onError: (error) => {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // File handling
  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please select a PDF file.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please select a PDF smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setCurrentStep(2);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Form submission
  const handleGenerate = useCallback(() => {
    if (!selectedFile) {
      toast({
        title: "Please select a PDF file",
        description: "Upload a Python PDF to generate flashcards.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('pdf', selectedFile);
    formData.append('apiProvider', apiProvider);
    formData.append('flashcardCount', flashcardCount.toString());
    formData.append('focusAreas', JSON.stringify(focusAreas));
    formData.append('difficulty', difficulty);

    uploadMutation.mutate(formData);
  }, [selectedFile, apiProvider, flashcardCount, focusAreas, difficulty, uploadMutation]);

  // Update UI based on job status
  if (jobStatus) {
    if (jobStatus.status === 'completed' && currentStep < 4) {
      setCurrentStep(4);
      setPreviewFlashcards(JSON.parse(jobStatus.flashcards || '[]').slice(0, 3));
    }
  }

  const getStepIndicatorClass = (step: number) => {
    if (step < currentStep) return "step-indicator step-completed w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-semibold";
    if (step === currentStep) return "step-indicator step-active w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-semibold";
    return "step-indicator w-10 h-10 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-sm font-semibold";
  };

  const getProgressWidth = (step: number) => {
    return step < currentStep ? "100%" : "0%";
  };

  // Update flashcards when job completes
  if (jobStatus?.status === 'completed' && jobStatus.flashcards && allFlashcards.length === 0) {
    try {
      const flashcards = JSON.parse(jobStatus.flashcards);
      setAllFlashcards(flashcards);
    } catch (error) {
      console.error('Error parsing flashcards:', error);
    }
  }

  // View management
  if (currentView === 'edit' && allFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50">
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
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary text-white rounded-lg p-2">
                <Brain className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral">Python Syntax Flashcard Generator</h1>
                <p className="text-gray-600 text-sm">Transform PDFs into interactive Anki flashcards</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-500">Powered by AI</span>
              <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                <Shield className="w-3 h-3 mr-1 inline" />
                Secure
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4 md:space-x-8">
            <div className="flex items-center">
              <div className={getStepIndicatorClass(1)}>1</div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= 1 ? 'text-neutral' : 'text-gray-400'}`}>Upload PDF</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full max-w-20">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: getProgressWidth(2) }}></div>
            </div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(2)}>2</div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= 2 ? 'text-neutral' : 'text-gray-400'}`}>Configure</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full max-w-20">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: getProgressWidth(3) }}></div>
            </div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(3)}>3</div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= 3 ? 'text-neutral' : 'text-gray-400'}`}>Generate</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 rounded-full max-w-20">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: getProgressWidth(4) }}></div>
            </div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(4)}>4</div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= 4 ? 'text-neutral' : 'text-gray-400'}`}>Download</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workflow */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Step 1: PDF Upload */}
            <Card className="animate-fade-in">
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className="bg-primary text-white rounded-lg p-2 mr-3">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-neutral">Upload Your Python PDF</h2>
                </div>
                
                <div 
                  className={`upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer ${isDragOver ? 'dragover border-primary' : 'border-gray-300'}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-4">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-neutral mb-2">Drop your PDF here, or click to browse</p>
                      <p className="text-sm text-gray-500">Supports PDF files up to 10MB</p>
                    </div>
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                      <span className="flex items-center"><CheckCircle className="w-3 h-3 mr-1 text-green-500" />Python tutorials</span>
                      <span className="flex items-center"><CheckCircle className="w-3 h-3 mr-1 text-green-500" />Documentation</span>
                      <span className="flex items-center"><CheckCircle className="w-3 h-3 mr-1 text-green-500" />Textbooks</span>
                    </div>
                  </div>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept=".pdf"
                    onChange={handleFileInputChange}
                  />
                </div>

                {/* File Preview */}
                {selectedFile && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="font-medium text-neutral">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Configuration */}
            <Card className={`${currentStep >= 2 ? '' : 'opacity-50 pointer-events-none'}`}>
              <CardContent className="p-8">
                <div className="flex items-center mb-6">
                  <div className={`rounded-lg p-2 mr-3 ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-gray-400 text-white'}`}>
                    <Settings className="w-5 h-5" />
                  </div>
                  <h2 className={`text-xl font-semibold ${currentStep >= 2 ? 'text-neutral' : 'text-gray-400'}`}>Configuration Settings</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-neutral">AI Provider</Label>
                    <Select value={apiProvider} onValueChange={(value: "openai" | "anthropic") => setApiProvider(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">Anthropic Claude (Recommended)</SelectItem>
                        <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 flex items-center">
                      <Shield className="w-3 h-3 mr-1" />
                      AI processing powered by secure system keys
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-neutral">Number of Flashcards</Label>
                    <Select value={flashcardCount.toString()} onValueChange={(value) => setFlashcardCount(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 flashcards (Free)</SelectItem>
                        <SelectItem value="25">25 flashcards (Free)</SelectItem>
                        <SelectItem value="50">50 flashcards (Premium)</SelectItem>
                        <SelectItem value="100">100 flashcards (Premium)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500">
                      {flashcardCount <= 25 ? 'Free tier includes up to 25 flashcards' : 'Premium feature - upgrade for more flashcards'}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Button 
                      variant="ghost" 
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-primary text-sm font-medium hover:text-blue-700 flex items-center p-0"
                    >
                      <ChevronDown className={`w-4 h-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                      Advanced Options
                    </Button>
                    
                    {showAdvanced && (
                      <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-neutral mb-2 block">Focus Areas</Label>
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={focusAreas.syntax}
                                  onCheckedChange={(checked) => setFocusAreas({...focusAreas, syntax: !!checked})}
                                />
                                <label className="text-sm">Syntax & Grammar</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={focusAreas.dataStructures}
                                  onCheckedChange={(checked) => setFocusAreas({...focusAreas, dataStructures: !!checked})}
                                />
                                <label className="text-sm">Data Structures</label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  checked={focusAreas.controlFlow}
                                  onCheckedChange={(checked) => setFocusAreas({...focusAreas, controlFlow: !!checked})}
                                />
                                <label className="text-sm">Control Flow</label>
                              </div>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-neutral mb-2 block">Difficulty Level</Label>
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
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <Button 
                    onClick={handleGenerate}
                    disabled={!selectedFile || uploadMutation.isPending}
                    className="w-full bg-primary text-white py-4 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <LoaderPinwheel className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
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

            {/* Step 3: Processing */}
            {currentStep === 3 && jobStatus && (
              <Card>
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-accent text-white rounded-lg p-2 mr-3">
                      <Brain className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-semibold text-neutral">Generating Flashcards</h2>
                  </div>

                  <div className="mb-8">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm text-gray-600">{jobStatus.currentTask || 'Processing...'}</span>
                      <span className="text-sm text-gray-600">{jobStatus.progress}%</span>
                    </div>
                    <Progress value={jobStatus.progress} className="h-3" />
                  </div>

                  <div className="space-y-4">
                    <div className={`flex items-center p-3 rounded-lg ${jobStatus.progress >= 25 ? 'bg-green-50' : 'bg-gray-50'}`}>
                      {jobStatus.progress >= 25 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400 mr-3" />
                      )}
                      <span className={`text-sm ${jobStatus.progress >= 25 ? 'text-green-700' : 'text-gray-400'}`}>
                        PDF text extracted successfully
                      </span>
                    </div>
                    
                    <div className={`flex items-center p-3 rounded-lg ${jobStatus.progress >= 75 ? 'bg-green-50' : jobStatus.progress >= 25 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      {jobStatus.progress >= 75 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      ) : jobStatus.progress >= 25 ? (
                        <LoaderPinwheel className="w-5 h-5 text-primary mr-3 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400 mr-3" />
                      )}
                      <span className={`text-sm ${jobStatus.progress >= 75 ? 'text-green-700' : jobStatus.progress >= 25 ? 'text-primary' : 'text-gray-400'}`}>
                        Analyzing content with AI...
                      </span>
                    </div>
                    
                    <div className={`flex items-center p-3 rounded-lg ${jobStatus.progress >= 90 ? 'bg-green-50' : jobStatus.progress >= 75 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      {jobStatus.progress >= 90 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      ) : jobStatus.progress >= 75 ? (
                        <LoaderPinwheel className="w-5 h-5 text-primary mr-3 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400 mr-3" />
                      )}
                      <span className={`text-sm ${jobStatus.progress >= 90 ? 'text-green-700' : jobStatus.progress >= 75 ? 'text-primary' : 'text-gray-400'}`}>
                        Creating flashcard pairs
                      </span>
                    </div>
                    
                    <div className={`flex items-center p-3 rounded-lg ${jobStatus.progress >= 100 ? 'bg-green-50' : jobStatus.progress >= 90 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                      {jobStatus.progress >= 100 ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      ) : jobStatus.progress >= 90 ? (
                        <LoaderPinwheel className="w-5 h-5 text-primary mr-3 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400 mr-3" />
                      )}
                      <span className={`text-sm ${jobStatus.progress >= 100 ? 'text-green-700' : jobStatus.progress >= 90 ? 'text-primary' : 'text-gray-400'}`}>
                        Generating Anki deck
                      </span>
                    </div>
                  </div>

                  {jobStatus.errorMessage && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">{jobStatus.errorMessage}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Step 4: Preview and Download */}
            {currentStep === 4 && jobStatus && (
              <>
                <Card>
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="bg-secondary text-white rounded-lg p-2 mr-3">
                          <Eye className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-semibold text-neutral">Preview Flashcards</h2>
                      </div>
                      <span className="text-sm text-gray-600">{flashcardCount} flashcards generated</span>
                    </div>

                    {previewFlashcards.map((card, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg mb-4">
                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                          <h4 className="font-medium text-neutral mb-2">Question:</h4>
                          <p className="text-gray-700">{card.question}</p>
                        </div>
                        <div className="p-4">
                          <h4 className="font-medium text-neutral mb-2">Answer:</h4>
                          <pre className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm whitespace-pre-wrap">
                            <code>{card.answer}</code>
                          </pre>
                        </div>
                      </div>
                    ))}

                    <div className="space-y-4 mt-6">
                      <div className="flex items-center justify-between">
                        <Button 
                          variant="outline"
                          onClick={() => setShowAllFlashcards(true)}
                        >
                          View All {flashcardCount} Flashcards
                        </Button>
                        <div className="flex space-x-3">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setCurrentStep(2);
                              setCurrentJobId(null);
                            }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Regenerate
                          </Button>
                          <Button 
                            onClick={() => setCurrentStep(5)}
                            className="bg-secondary text-white hover:bg-green-700"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Create Anki Deck
                          </Button>
                        </div>
                      </div>
                      
                      {/* Advanced Feature Buttons */}
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
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/api/export/${currentJobId}/csv`, '_blank')}
                          className="flex items-center justify-center text-xs"
                        >
                          Export CSV
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Final Download */}
                {currentStep === 5 && (
                  <Card>
                    <CardContent className="p-8">
                      <div className="flex items-center mb-6">
                        <div className="bg-secondary text-white rounded-lg p-2 mr-3">
                          <Download className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-semibold text-neutral">Your Anki Deck is Ready!</h2>
                      </div>

                      <div className="text-center py-8">
                        <div className="bg-green-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Check className="w-8 h-8 text-secondary" />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral mb-2">Flashcards Generated Successfully</h3>
                        <p className="text-gray-600 mb-6">Your Python syntax flashcard deck has been created and is ready for import into Anki.</p>
                        
                        <div className="bg-gray-50 rounded-lg p-6 mb-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div>
                              <div className="text-2xl font-bold text-primary">{flashcardCount}</div>
                              <div className="text-sm text-gray-600">Flashcards</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-primary">~1.2MB</div>
                              <div className="text-sm text-gray-600">File Size</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-primary">Mixed</div>
                              <div className="text-sm text-gray-600">Topics</div>
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-primary">{difficulty}</div>
                              <div className="text-sm text-gray-600">Difficulty</div>
                            </div>
                          </div>
                        </div>

                        <Button 
                          onClick={() => currentJobId && downloadMutation.mutate(currentJobId)}
                          disabled={downloadMutation.isPending}
                          className="bg-secondary text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors mb-4"
                        >
                          {downloadMutation.isPending ? (
                            <>
                              <LoaderPinwheel className="w-4 h-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-2" />
                              Download Python_Syntax_Flashcards.apkg
                            </>
                          )}
                        </Button>
                        
                        <p className="text-sm text-gray-500">
                          <Info className="w-4 h-4 mr-1 inline" />
                          Import this file directly into Anki to start studying
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Help & Instructions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-neutral mb-4 flex items-center">
                  <HelpCircle className="w-5 h-5 text-primary mr-2" />
                  How It Works
                </h3>
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">1</span>
                    <p>Upload any Python-related PDF document (tutorials, textbooks, documentation)</p>
                  </div>
                  <div className="flex">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">2</span>
                    <p>Configure your AI provider and set the number of flashcards you want</p>
                  </div>
                  <div className="flex">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">3</span>
                    <p>AI analyzes the content and generates Python syntax-focused flashcards</p>
                  </div>
                  <div className="flex">
                    <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">4</span>
                    <p>Download the .apkg file and import it directly into Anki</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API Key Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-neutral mb-3 flex items-center">
                  <Key className="w-5 h-5 text-primary mr-2" />
                  API Key Required
                </h3>
                <p className="text-sm text-gray-700 mb-4">You'll need an API key from either:</p>
                <div className="space-y-2 text-sm">
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:text-blue-700 transition-colors">
                    <Brain className="w-4 h-4 mr-2" />
                    OpenAI Platform
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                  <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:text-blue-700 transition-colors">
                    <Brain className="w-4 h-4 mr-2" />
                    Anthropic Console
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </a>
                </div>
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-xs text-gray-600 flex items-center">
                    <ShieldCheck className="w-3 h-3 text-green-500 mr-1" />
                    Keys are used securely and never stored on our servers
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Sample Output */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-neutral mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 text-accent mr-2" />
                  Sample Flashcard
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-3 border-b">
                    <p className="text-sm font-medium text-neutral">Front:</p>
                    <p className="text-sm text-gray-700 mt-1">What's the syntax for a Python dictionary comprehension?</p>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-neutral">Back:</p>
                    <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded mt-1 font-mono">{`{key: value for item in iterable}`}</pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-neutral mb-4 flex items-center">
                  <Star className="w-5 h-5 text-accent mr-2" />
                  Features
                </h3>
                <div className="space-y-3">
                  {[
                    "AI-powered content analysis",
                    "Python syntax focused",
                    "Direct Anki compatibility",
                    "Batch processing",
                    "Customizable quantity",
                    "Secure processing"
                  ].map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-secondary mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              <p className="text-sm text-gray-600">Built with Python, AI, and ❤️</p>
              <div className="flex space-x-2">
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">PyMuPDF</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">genanki</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">OpenAI/Claude</span>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
