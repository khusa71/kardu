import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/lib/supabase";
import { NavigationBar } from "@/components/navigation-bar";
import { AuthModal } from "@/components/auth-modal";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload as UploadIcon, 
  FileText, 
  Settings, 
  Zap, 
  CheckCircle, 
  ArrowRight, 
  Plus,
  X,
  Loader2,
  Brain,
  Target,
  BookOpen,
  Lightbulb,
  Sparkles,
  Play,
  Download,
  Edit,
  Eye,
  Grid3x3,
  List,
  ExternalLink,
  Copy
} from "lucide-react";
import type { FlashcardPair } from "@shared/schema";

export default function Upload() {
  const { toast } = useToast();
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, sendVerificationEmail } = useSupabaseAuth();
  const [, setLocation] = useLocation();
  
  // Core state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  // Performance monitoring
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Configuration state
  const [subject, setSubject] = useState("general");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [flashcardCount, setFlashcardCount] = useState(10);
  const [apiProvider, setApiProvider] = useState<"basic" | "advanced">("basic");
  const [focusAreas, setFocusAreas] = useState({
    concepts: true,
    definitions: true,
    examples: false,
    procedures: false,
  });
  const [customContext, setCustomContext] = useState("");
  const [customFileName, setCustomFileName] = useState("");
  
  // Results state
  const [generatedFlashcards, setGeneratedFlashcards] = useState<FlashcardPair[]>([]);
  const [previewMode, setPreviewMode] = useState<'grid' | 'list'>('grid');

  // Fetch user data
  const { data: userData } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: !!user,
  });

  const isPremium = (userData as any)?.isPremium || false;
  const isEmailVerified = user && (user as any).email_confirmed_at != null;

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest('POST', '/api/upload', formData);
      return response.json();
    },
    onSuccess: (data) => {
      const jobId = data.jobs && data.jobs.length > 0 ? data.jobs[0].jobId : data.jobId;
      
      setCurrentJobId(jobId);
      setCurrentStep(3);
      setIsProcessing(true);
      setUploadProgress(10);
      setProcessingStage('Upload complete, analyzing PDF...');
      
      // Calculate estimated processing time
      const fileSize = selectedFiles[0]?.size || 0;
      const estimatedMinutes = Math.ceil((fileSize / 1024 / 1024) * 0.3);
      setEstimatedTime(Math.max(estimatedMinutes, 1));
      
      toast({
        title: "Upload successful!",
        description: "Your PDF is being processed. This may take a few minutes.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Real-time job status polling with proper state management
  const { data: jobStatus, error: jobStatusError } = useQuery({
    queryKey: ['/api/jobs', currentJobId],
    queryFn: async () => {
      if (!currentJobId) throw new Error('No job ID');
      const response = await apiRequest('GET', `/api/jobs/${currentJobId}`, undefined);
      return response.json();
    },
    enabled: !!currentJobId && isProcessing,
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true,
    retry: 3,
    retryDelay: 1000,
  });

  // Monitor job status changes from React Query polling
  useEffect(() => {
    console.log('=== JOB STATUS MONITOR ===');
    console.log('jobStatus:', JSON.stringify(jobStatus, null, 2));
    console.log('jobStatusError:', jobStatusError);
    console.log('isProcessing:', isProcessing);
    console.log('currentStep:', currentStep);
    console.log('currentJobId:', currentJobId);
    
    if (!jobStatus || !isProcessing) {
      console.log('Skipping monitor: no jobStatus or not processing');
      return;
    }
    
    const status = (jobStatus as any)?.status;
    console.log('🔍 Job status from React Query:', status);
    
    if (status === 'completed') {
      console.log('🎉 JOB COMPLETED - TRANSITIONING TO STEP 4');
      
      let flashcards = [];
      const flashcardsData = (jobStatus as any)?.flashcards;
      
      if (flashcardsData) {
        console.log('Processing flashcards data, type:', typeof flashcardsData);
        try {
          flashcards = Array.isArray(flashcardsData) 
            ? flashcardsData 
            : JSON.parse(flashcardsData);
          console.log('✅ Successfully parsed flashcards:', flashcards.length, 'cards');
        } catch (error) {
          console.error('❌ Error parsing flashcards:', error);
          flashcards = [];
        }
      } else {
        console.log('⚠️ No flashcards data in response');
      }
      
      console.log('🔄 CRITICAL: Updating state for job completion...');
      console.log('- Setting flashcards:', flashcards.length);
      console.log('- Setting isProcessing to false');
      console.log('- Setting currentStep to 4');
      
      setGeneratedFlashcards(flashcards);
      setIsProcessing(false);
      setCurrentStep(4);
      
      console.log('✅ State updates completed');
      
      toast({
        title: "Flashcards Ready!",
        description: `Generated ${flashcards.length} flashcards successfully.`,
      });
      
    } else if (status === 'failed') {
      console.log('❌ JOB FAILED');
      const errorMessage = (jobStatus as any)?.errorMessage || "Generation failed. Please try again.";
      
      setIsProcessing(false);
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } else {
      console.log('📊 Job status:', status, '- continuing to poll...');
    }
  }, [jobStatus, jobStatusError, isProcessing, currentStep, currentJobId, toast]);

  // Handle job completion
  useEffect(() => {
    console.log('=== JOB STATUS DEBUG ===');
    console.log('Job status update:', jobStatus);
    console.log('Job status error:', jobStatusError);
    console.log('Current processing state:', isProcessing);
    console.log('Current job ID:', currentJobId);
    console.log('========================');
    
    if (jobStatus && (jobStatus as any).status === 'completed') {
      console.log('Job completed, processing flashcards...');
      let flashcards: FlashcardPair[] = [];
      
      if ((jobStatus as any).flashcards) {
        if (Array.isArray((jobStatus as any).flashcards)) {
          flashcards = (jobStatus as any).flashcards;
        } else if (typeof (jobStatus as any).flashcards === 'string') {
          try {
            const parsed = JSON.parse((jobStatus as any).flashcards);
            flashcards = Array.isArray(parsed) ? parsed : [];
          } catch (error) {
            console.error('Failed to parse flashcards:', error);
            flashcards = [];
          }
        }
      }
      
      console.log('Extracted flashcards:', flashcards.length);
      setGeneratedFlashcards(flashcards);
      setIsProcessing(false);
      setCurrentStep(4);
      
      toast({
        title: "Flashcards generated!",
        description: `Successfully created ${flashcards.length} flashcards.`,
      });
    }
    
    if (jobStatus && (jobStatus as any).status === 'failed') {
      console.log('Job failed:', (jobStatus as any).errorMessage);
      setIsProcessing(false);
      toast({
        title: "Generation failed",
        description: (jobStatus as any).errorMessage || "Please try again.",
        variant: "destructive",
      });
    }
  }, [jobStatus, toast, isProcessing, currentJobId]);

  // File selection handler
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const pdfFiles = fileArray.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== fileArray.length) {
      toast({
        title: "Invalid file type",
        description: "Please select only PDF files.",
        variant: "destructive",
      });
      return;
    }
    
    const maxFiles = isPremium ? 10 : 1;
    if (pdfFiles.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `${isPremium ? 'Premium' : 'Free'} users can upload up to ${maxFiles} file${maxFiles > 1 ? 's' : ''} at once.`,
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFiles(pdfFiles);
    setCurrentStep(2);
  }, [isPremium, toast]);

  // Generate flashcards
  const handleGenerate = useCallback(() => {
    if (!user || !isEmailVerified) {
      setShowAuthModal(true);
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select a PDF file first.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('pdfs', file);
    });
    
    formData.append('subject', subject);
    formData.append('difficulty', difficulty);
    formData.append('flashcardCount', flashcardCount.toString());
    formData.append('apiProvider', apiProvider);
    formData.append('focusAreas', JSON.stringify(focusAreas));
    
    if (customContext.trim()) {
      formData.append('customContext', customContext);
    }
    if (customFileName.trim()) {
      formData.append('customFileName', customFileName);
    }

    uploadMutation.mutate(formData);
  }, [selectedFiles, subject, difficulty, flashcardCount, apiProvider, focusAreas, customContext, customFileName, user, isEmailVerified, uploadMutation, toast]);

  // Reset form
  const resetForm = () => {
    setSelectedFiles([]);
    setCurrentStep(1);
    setCurrentJobId(null);
    setIsProcessing(false);
    setGeneratedFlashcards([]);
    setCustomFileName("");
    setCustomContext("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Welcome to Kardu.io</CardTitle>
              <p className="text-muted-foreground">Sign in to start creating AI-powered flashcards</p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowAuthModal(true)} 
                className="w-full h-12 text-lg"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Compact Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Smart Flashcards
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Transform PDFs into AI-powered flashcards in minutes
          </p>
        </div>

        {/* Compact Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            {[
              { step: 1, label: "Upload", icon: UploadIcon },
              { step: 2, label: "Configure", icon: Settings },
              { step: 3, label: "Process", icon: Brain },
              { step: 4, label: "Study", icon: BookOpen }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium transition-all duration-200 ${
                  currentStep >= item.step 
                    ? 'bg-foreground text-background' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > item.step ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    item.step
                  )}
                </div>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-1 ${
                    currentStep > item.step ? 'bg-foreground' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <Card className="border border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                  <UploadIcon className="w-5 h-5" />
                  Upload PDF
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select PDF documents to convert into flashcards
                </p>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors cursor-pointer bg-muted/30"
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                      <FileText className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground mb-1">
                        Drop PDF here or click to browse
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Max {isPremium ? '10' : '1'} file{isPremium ? 's' : ''} • PDF format only
                      </p>
                    </div>
                    <Button size="sm" className="h-8">
                      <Plus className="w-4 h-4 mr-1" />
                      Choose Files
                    </Button>
                  </div>
                </div>
                
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf"
                  multiple={isPremium}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />

                {selectedFiles.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <h4 className="font-medium text-foreground">Selected Files:</h4>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-foreground">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFiles(files => files.filter((_, i) => i !== index));
                            if (selectedFiles.length === 1) setCurrentStep(1);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      onClick={() => setCurrentStep(2)} 
                      className="w-full mt-4" 
                      size="lg"
                    >
                      Continue to Configuration
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Configuration */}
          {currentStep === 2 && (
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl flex items-center justify-center gap-3">
                  <Settings className="w-7 h-7 text-primary" />
                  Customize Your Flashcards
                </CardTitle>
                <p className="text-muted-foreground">
                  Configure how you want your flashcards generated
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced Options</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-6 mt-6">
                    {/* Subject Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Subject Area
                      </label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select subject area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Knowledge</SelectItem>
                          <SelectItem value="programming">Programming & Tech</SelectItem>
                          <SelectItem value="science">Science & Mathematics</SelectItem>
                          <SelectItem value="history">History & Social Studies</SelectItem>
                          <SelectItem value="language">Language & Literature</SelectItem>
                          <SelectItem value="business">Business & Economics</SelectItem>
                          <SelectItem value="medicine">Medicine & Health</SelectItem>
                          <SelectItem value="law">Law & Legal Studies</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Difficulty Level */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Brain className="w-4 h-4" />
                        Difficulty Level
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                          <Button
                            key={level}
                            variant={difficulty === level ? "default" : "outline"}
                            onClick={() => setDifficulty(level)}
                            className="h-12 flex flex-col"
                          >
                            <span className="font-medium capitalize">{level}</span>
                            <span className="text-xs opacity-70">
                              {level === 'beginner' && 'Simple & Clear'}
                              {level === 'intermediate' && 'Balanced'}
                              {level === 'advanced' && 'Detailed & Complex'}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Number of Cards */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Number of Flashcards
                      </label>
                      <div className="grid grid-cols-4 gap-3">
                        {[5, 10, 15, 20].map((count) => (
                          <Button
                            key={count}
                            variant={flashcardCount === count ? "default" : "outline"}
                            onClick={() => setFlashcardCount(count)}
                            className="h-12"
                          >
                            {count}
                          </Button>
                        ))}
                      </div>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={flashcardCount}
                        onChange={(e) => setFlashcardCount(parseInt(e.target.value) || 10)}
                        className="h-12"
                        placeholder="Custom amount (1-50)"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-6 mt-6">
                    {/* AI Model Selection */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        AI Model Quality
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant={apiProvider === "basic" ? "default" : "outline"}
                          onClick={() => setApiProvider("basic")}
                          className="h-16 flex flex-col"
                        >
                          <span className="font-medium">Standard</span>
                          <span className="text-xs opacity-70">Fast & Reliable</span>
                          <Badge variant="secondary" className="mt-1">Free</Badge>
                        </Button>
                        <Button
                          variant={apiProvider === "advanced" ? "default" : "outline"}
                          onClick={() => setApiProvider("advanced")}
                          className="h-16 flex flex-col"
                          disabled={!isPremium}
                        >
                          <span className="font-medium">Premium</span>
                          <span className="text-xs opacity-70">Advanced AI</span>
                          <Badge variant="default" className="mt-1">Pro Only</Badge>
                        </Button>
                      </div>
                    </div>

                    {/* Focus Areas */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Focus Areas
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(focusAreas).map(([key, value]) => (
                          <Button
                            key={key}
                            variant={value ? "default" : "outline"}
                            onClick={() => setFocusAreas(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                            className="h-12"
                          >
                            <span className="capitalize">{key}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Context */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Custom Instructions (Optional)
                      </label>
                      <Textarea
                        placeholder="Provide specific instructions for flashcard generation..."
                        value={customContext}
                        onChange={(e) => setCustomContext(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                    </div>

                    {/* Custom File Name */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">
                        Custom File Name (Optional)
                      </label>
                      <Input
                        placeholder="Enter a custom name for your flashcard set"
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 h-12"
                  >
                    Back to Upload
                  </Button>
                  <Button 
                    onClick={handleGenerate}
                    disabled={uploadMutation.isPending}
                    className="flex-1 h-12 text-lg"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Enhanced Processing with Progress Tracking */}
          {currentStep === 3 && (
            <Card className="border border-border">
              <CardContent className="py-8">
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 text-foreground animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Creating Your Flashcards
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      AI is analyzing your PDF and generating smart flashcards
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    
                    {/* Processing Stage Indicator */}
                    <div className="text-xs text-muted-foreground">
                      {processingStage}
                    </div>
                    
                    {/* Estimated Time Remaining */}
                    {estimatedTime && (
                      <div className="text-xs text-muted-foreground">
                        Estimated time: ~{estimatedTime} minute{estimatedTime !== 1 ? 's' : ''}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Status: {jobStatus ? (jobStatus as any)?.status || 'Processing...' : 'Processing...'}
                    </p>
                    
                    <div className="mt-6 p-6 bg-muted/30 rounded-xl border border-border">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            AI Processing Your PDF
                          </h3>
                          <div className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {Math.round(((jobStatus as any)?.progress || 0))}% Complete
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-foreground rounded-full"></div>
                            <span className="text-foreground font-medium">PDF parsed and text extracted</span>
                            <CheckCircle className="w-4 h-4 text-foreground ml-auto" />
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-foreground rounded-full"></div>
                            <span className="text-foreground font-medium">Content analyzed and chunked intelligently</span>
                            <CheckCircle className="w-4 h-4 text-foreground ml-auto" />
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-foreground rounded-full"></div>
                            <span className="text-foreground font-medium">Key concepts and topics identified</span>
                            <CheckCircle className="w-4 h-4 text-foreground ml-auto" />
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className={`w-2 h-2 rounded-full ${(jobStatus as any)?.status === 'processing' ? 'bg-muted-foreground animate-pulse' : 'bg-foreground'}`}></div>
                            <span className="text-foreground font-medium">
                              {(jobStatus as any)?.status === 'processing' 
                                ? 'AI generating intelligent questions and answers...' 
                                : 'AI flashcard generation complete'}
                            </span>
                            {(jobStatus as any)?.status === 'processing' ? (
                              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-auto" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-foreground ml-auto" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className={`w-2 h-2 rounded-full ${(jobStatus as any)?.status === 'completed' ? 'bg-foreground' : 'bg-muted-foreground'}`}></div>
                            <span className="text-foreground font-medium">
                              {(jobStatus as any)?.status === 'completed' 
                                ? `${((jobStatus as any)?.flashcards?.length || 0)} flashcards ready for study` 
                                : 'Finalizing your study deck...'}
                            </span>
                            {(jobStatus as any)?.status === 'completed' && (
                              <Sparkles className="w-4 h-4 text-foreground ml-auto" />
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-border">
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            Our advanced AI is analyzing your content structure, identifying key learning concepts, 
                            and crafting effective questions that enhance retention and understanding.
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fallback action buttons */}
                    <div className="mt-6 space-y-3">
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setLocation('/history')}
                          className="flex-1"
                        >
                          Go to History
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setIsProcessing(false);
                            setCurrentStep(1);
                            setCurrentJobId(null);
                          }}
                          className="flex-1"
                        >
                          Start Over
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Results */}
          {currentStep === 4 && generatedFlashcards.length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-foreground" />
                    <div>
                      <CardTitle className="text-xl">Flashcards Ready</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {generatedFlashcards.length} cards generated
                      </p>
                    </div>
                  </div>
                  
                  {/* Compact Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setLocation(`/study/${currentJobId}`)}
                      size="sm"
                      className="h-9"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Study Now
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`/api/export/${currentJobId}/anki`, '_blank')}
                      className="h-9"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Quick Actions Row */}
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/api/export/${currentJobId}/csv`, '_blank')}
                    className="h-8 text-xs"
                  >
                    CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(`/api/export/${currentJobId}/json`, '_blank')}
                    className="h-8 text-xs"
                  >
                    JSON
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation(`/edit/${currentJobId}`)}
                    className="h-8 text-xs"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLocation('/history')}
                    className="h-8 text-xs"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    History
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    New Set
                  </Button>
                </div>

                {/* Compact Flashcard Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Preview</span>
                    <Badge variant="secondary" className="text-xs">
                      {generatedFlashcards.length} cards
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                    {generatedFlashcards.slice(0, 4).map((card, index) => (
                      <div key={index} className="bg-muted/30 border border-border rounded-lg p-3 hover:border-accent transition-colors group">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(`Q: ${card.front}\nA: ${card.back}`);
                              toast({ title: "Copied to clipboard" });
                            }}
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-foreground line-clamp-2">
                            {card.front}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1 border-t border-border pt-1">
                            {card.back}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {generatedFlashcards.length > 4 && (
                    <div className="text-center">
                      <span className="text-xs text-muted-foreground">
                        +{generatedFlashcards.length - 4} more cards available
                      </span>
                    </div>
                  )}
                </div>

                {generatedFlashcards.length > 6 && (
                  <p className="text-center text-muted-foreground">
                    And {generatedFlashcards.length - 6} more flashcards...
                  </p>
                )}

                {/* Main Action Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
                  <Button 
                    onClick={() => setLocation(`/study/${currentJobId}`)}
                    size="lg"
                    className="h-14 text-lg font-semibold"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Studying
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/history')}
                    size="lg"
                    className="h-14"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    View All Sets
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    size="lg"
                    className="h-14"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create New Set
                  </Button>
                </div>

                {/* Additional Options */}
                <div className="flex justify-center pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Need help? Visit our{" "}
                    <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-foreground">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Study Guide
                    </Button>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}