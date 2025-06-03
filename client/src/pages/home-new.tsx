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
import { Brain, FileText, Settings, Download, Upload, ChevronDown, CheckCircle, Clock, LoaderPinwheel, Check, Lightbulb, Star, HelpCircle, ExternalLink, Shield, ShieldCheck, Info, AlertCircle, RotateCcw } from "lucide-react";
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

  const safeProgress = (value: number | null | undefined): number => {
    return value || 0;
  };

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
                <h1 className="text-2xl font-bold text-neutral dark:text-white">Python Syntax Flashcard Generator</h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Transform PDFs into interactive Anki flashcards</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Powered by AI</span>
              <div className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
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
              <span className={`ml-2 text-sm font-medium ${currentStep >= 1 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Upload PDF</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full max-w-20">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: getProgressWidth(2) }}></div>
            </div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(2)}>2</div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= 2 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Configure</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full max-w-20">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: getProgressWidth(3) }}></div>
            </div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(3)}>3</div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= 3 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Generate</span>
            </div>
            <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full max-w-20">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: getProgressWidth(4) }}></div>
            </div>
            <div className="flex items-center">
              <div className={getStepIndicatorClass(4)}>4</div>
              <span className={`ml-2 text-sm font-medium ${currentStep >= 4 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Download</span>
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
                  <h2 className="text-xl font-semibold text-neutral dark:text-white">Upload Your Python PDF</h2>
                </div>
                
                <div 
                  className={`upload-zone border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragOver ? 'dragover border-primary bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-neutral dark:text-white mb-2">Drop your PDF here, or click to browse</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Supports PDF files up to 10MB</p>
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
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="font-medium text-neutral dark:text-white">{selectedFile.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
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
                  <h2 className={`text-xl font-semibold ${currentStep >= 2 ? 'text-neutral dark:text-white' : 'text-gray-400'}`}>Configuration Settings</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-neutral dark:text-white">AI Provider</Label>
                    <Select value={apiProvider} onValueChange={(value: "openai" | "anthropic") => setApiProvider(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anthropic">Anthropic Claude (Recommended)</SelectItem>
                        <SelectItem value="openai">OpenAI GPT-4</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Shield className="w-3 h-3 mr-1" />
                      AI processing powered by secure system keys
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-neutral dark:text-white">Number of Flashcards</Label>
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {flashcardCount <= 25 ? 'Free tier includes up to 25 flashcards' : 'Premium feature - upgrade for more flashcards'}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Advanced Options
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                    </Button>

                    {showAdvanced && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-neutral dark:text-white mb-3 block">Focus Areas</Label>
                          <div className="space-y-3">
                            {Object.entries(focusAreas).map(([key, value]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={key}
                                  checked={value}
                                  onCheckedChange={(checked) => 
                                    setFocusAreas(prev => ({ ...prev, [key]: !!checked }))
                                  }
                                />
                                <Label htmlFor={key} className="text-sm text-gray-700 dark:text-gray-300">
                                  {key === 'syntax' && 'Python syntax and grammar'}
                                  {key === 'dataStructures' && 'Data structures (lists, dictionaries, sets)'}
                                  {key === 'controlFlow' && 'Control flow (loops, conditionals, exceptions)'}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-neutral dark:text-white">Difficulty Level</Label>
                          <Select value={difficulty} onValueChange={(value: "beginner" | "intermediate" | "advanced") => setDifficulty(value)}>
                            <SelectTrigger className="mt-2">
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
                        <Lightbulb className="w-4 h-4 mr-2" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Processing Status */}
            {currentStep >= 3 && jobStatus && (
              <Card className="animate-slide-up">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-accent text-white rounded-lg p-2 mr-3">
                      <LoaderPinwheel className="w-5 h-5 animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold text-neutral dark:text-white">Processing Your PDF</h2>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {jobStatus.currentTask || 'Processing...'}
                      </span>
                      <span className="text-sm font-medium text-primary">
                        {safeProgress(jobStatus.progress)}%
                      </span>
                    </div>
                    
                    <Progress value={safeProgress(jobStatus.progress)} className="h-2" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className={`p-3 rounded-lg ${safeProgress(jobStatus.progress) >= 25 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${safeProgress(jobStatus.progress) >= 25 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {safeProgress(jobStatus.progress) >= 25 ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <p className="text-xs font-medium">Text Extraction</p>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${safeProgress(jobStatus.progress) >= 50 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${safeProgress(jobStatus.progress) >= 50 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {safeProgress(jobStatus.progress) >= 50 ? <Check className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
                        </div>
                        <p className="text-xs font-medium">AI Analysis</p>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${safeProgress(jobStatus.progress) >= 75 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${safeProgress(jobStatus.progress) >= 75 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {safeProgress(jobStatus.progress) >= 75 ? <Check className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
                        </div>
                        <p className="text-xs font-medium">Flashcard Creation</p>
                      </div>
                      
                      <div className={`p-3 rounded-lg ${safeProgress(jobStatus.progress) >= 100 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${safeProgress(jobStatus.progress) >= 100 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                          {safeProgress(jobStatus.progress) >= 100 ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        </div>
                        <p className="text-xs font-medium">Anki Export</p>
                      </div>
                    </div>

                    {jobStatus.status === 'failed' && jobStatus.errorMessage && (
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
                      <Button 
                        onClick={() => downloadMutation.mutate(currentJobId!)}
                        disabled={downloadMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {downloadMutation.isPending ? (
                          <LoaderPinwheel className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Download Anki Deck
                      </Button>
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
                    <p>Upload your Python PDF (tutorials, documentation, textbooks)</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">2</div>
                    <p>AI analyzes content and identifies key Python syntax concepts</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5 flex-shrink-0">3</div>
                    <p>Smart flashcards are generated with questions and code examples</p>
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
                    <p>Use PDFs with clear Python code examples</p>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    <p>Choose intermediate level for comprehensive learning</p>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" />
                    <p>Focus on syntax and data structures for beginners</p>
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
                  <HelpCircle className="w-5 h-5 text-gray-500 mr-2" />
                  <h3 className="font-semibold text-neutral dark:text-white">Need help?</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  Having trouble with the flashcard generator? Check our guide or contact support.
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Help Center
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}