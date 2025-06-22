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
  const [selectedHistoricalFile, setSelectedHistoricalFile] = useState<any>(null);
  const [uploadMode, setUploadMode] = useState<'new' | 'historical'>('new');
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);

  // Performance monitoring
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Configuration state
  const [configMode, setConfigMode] = useState<"quick" | "custom">("quick");
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

  // Fetch historical files for reuse
  const { data: historicalFiles = [] } = useQuery({
    queryKey: ['/api/history'],
    enabled: !!user,
  });

  const typedHistoricalFiles = (historicalFiles as any[]) || [];

  const isPremium = (userData as any)?.isPremium || false;
  const isEmailVerified = user && (user as any).email_confirmed_at != null;

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await apiRequest('POST', '/api/upload', formData);
    },
    onSuccess: (data) => {
      let jobId = null;
      
      // Handle different response formats
      if (data.jobs && data.jobs.length > 0) {
        jobId = data.jobs[0].jobId || data.jobs[0].id;
      } else if (data.jobId) {
        jobId = data.jobId;
      } else if (data.id) {
        jobId = data.id;
      }
      
      if (!jobId) {
        toast({
          title: "Upload error",
          description: "Job ID not found in response. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      setCurrentJobId(jobId);
      setCurrentStep(3);
      setIsProcessing(true);
      setUploadProgress(10);
      setProcessingStage('Starting processing...');
      
      toast({
        title: "Upload successful!",
        description: "Processing your PDF now...",
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

  // Historical file reprocess mutation
  const reprocessMutation = useMutation({
    mutationFn: async (payload: { jobId: number; settings: any }) => {
      return await apiRequest('POST', '/api/reprocess', payload);
    },
    onSuccess: (data) => {
      const jobId = data.jobId || data.id;
      
      if (!jobId) {
        toast({
          title: "Reprocess error",
          description: "Job ID not found in response. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      setCurrentJobId(jobId);
      setCurrentStep(3);
      setIsProcessing(true);
      setUploadProgress(10);
      setProcessingStage('Starting reprocessing...');
      
      toast({
        title: "Reprocessing started!",
        description: "Generating new flashcards from your historical PDF...",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Reprocess failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Job status polling with enhanced retry logic
  const { data: jobStatus, error: jobStatusError } = useQuery({
    queryKey: ['/api/jobs', currentJobId],
    queryFn: async () => {
      return await apiRequest('GET', `/api/jobs/${currentJobId}`);
    },
    enabled: !!currentJobId && isProcessing && !!user,
    refetchInterval: (data) => {
      if (data && ((data as any)?.status === 'completed' || (data as any)?.status === 'failed')) {
        return false;
      }
      return 3000;
    },
    refetchIntervalInBackground: false,
    retry: (failureCount, error: any) => {
      if (error.message?.includes('401') || error.message?.includes('Authentication expired')) {
        return failureCount < 1;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Monitor job status changes
  useEffect(() => {
    if (!jobStatus || !isProcessing) return;
    
    const status = (jobStatus as any)?.status;
    const progress = (jobStatus as any)?.progress || 0;
    
    // Update progress tracking
    if (progress !== undefined) {
      setUploadProgress(Math.min(progress, 100));
      
      if (progress < 20) {
        setProcessingStage('Parsing PDF structure...');
      } else if (progress < 40) {
        setProcessingStage('Extracting key concepts...');
      } else if (progress < 60) {
        setProcessingStage('Analyzing content patterns...');
      } else if (progress < 80) {
        setProcessingStage('Generating Q&A pairs...');
      } else if (progress < 100) {
        setProcessingStage('Finalizing flashcards...');
      }
    }
    
    if (status === 'completed') {
      // Flashcards are now returned directly as arrays from the normalized API
      const flashcardsData = (jobStatus as any)?.flashcards || [];
      const flashcards = Array.isArray(flashcardsData) ? flashcardsData : [];
      
      setGeneratedFlashcards(flashcards);
      setIsProcessing(false);
      setCurrentStep(4);
      setUploadProgress(100);
      setProcessingStage('Complete!');
      
      toast({
        title: "Flashcards Ready!",
        description: `Generated ${flashcards.length} flashcards successfully.`,
      });
    } else if (status === 'failed') {
      const errorMessage = (jobStatus as any)?.errorMessage || "Generation failed. Please try again.";
      
      setIsProcessing(false);
      setUploadProgress(0);
      setProcessingStage('Processing failed');
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [jobStatus, isProcessing, currentStep, toast]);

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

    if (selectedFiles.length === 0 && !selectedHistoricalFile) {
      toast({
        title: "No files selected",
        description: "Please select a PDF file or choose from historical files.",
        variant: "destructive",
      });
      return;
    }

    // Handle historical file reprocessing
    if (selectedHistoricalFile) {
      const settings = {
        subject,
        difficulty,
        flashcardCount,
        apiProvider,
        focusAreas,
        customContext: customContext.trim() || undefined,
        customFileName: customFileName.trim() || undefined,
      };

      reprocessMutation.mutate({
        jobId: selectedHistoricalFile.id,
        settings,
      });
      return;
    }

    // Handle new file upload
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-full max-w-md mx-4 shadow-xl">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-xl">Sign In Required</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center mb-4">
                Please sign in to upload PDFs and generate flashcards.
              </p>
              <Button 
                onClick={() => setShowAuthModal(true)}
                className="w-full"
              >
                Sign In
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
            Transform your PDFs into study-ready flashcards with AI
          </p>
        </div>

        {/* Compact Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step 
                  ? 'bg-foreground text-background' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  currentStep > step ? 'bg-foreground' : 'bg-border'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Upload */}
        {currentStep === 1 && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="text-center">
                <div 
                  className="border-2 border-dashed border-border rounded-lg p-8 transition-colors hover:border-accent cursor-pointer"
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelect(e.dataTransfer.files);
                  }}
                >
                  <UploadIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload PDFs</h3>
                  <p className="text-muted-foreground mb-4">
                    Drag and drop or click to select PDF files
                  </p>
                  <Badge variant="secondary">
                    {isPremium ? 'Up to 10 files' : '1 file max'}
                  </Badge>
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
                  <div className="mt-6 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4" />
                          <span className="text-sm">{file.name}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button onClick={() => setCurrentStep(2)} className="w-full mt-4">
                      Configure Settings
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}

                {selectedHistoricalFile && (
                  <div className="mt-6 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{selectedHistoricalFile.filename}</span>
                        <Badge variant="secondary" className="ml-2">Historical</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedHistoricalFile(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Button onClick={() => setCurrentStep(2)} className="w-full mt-4">
                      Configure Settings
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}

                {/* Historical Files Section */}
                {Array.isArray(historicalFiles) && (historicalFiles as any[]).length > 0 && !selectedFiles.length && !selectedHistoricalFile && (
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4 text-center">Or Reuse Previous PDFs</h3>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Select from your previously uploaded files to generate new flashcards
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {(historicalFiles as any[]).slice(0, 10).map((file: any) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                          onClick={() => setSelectedHistoricalFile(file)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.filename}</p>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <span>{Math.round(file.fileSize / 1024)} KB</span>
                                <span>•</span>
                                <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {file.status === 'completed' && (
                              <Badge variant="secondary" className="text-xs">
                                {file.flashcardCount} cards
                              </Badge>
                            )}
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                    {(historicalFiles as any[]).length > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Showing 10 most recent files
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 2 && (
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-6">
              <Tabs value={configMode} onValueChange={(value) => setConfigMode(value as "quick" | "custom")}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="quick">Quick Start</TabsTrigger>
                  <TabsTrigger value="custom">Custom Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="quick" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Subject</label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General Study</SelectItem>
                          <SelectItem value="science">Science</SelectItem>
                          <SelectItem value="history">History</SelectItem>
                          <SelectItem value="language">Language</SelectItem>
                          <SelectItem value="math">Mathematics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Difficulty</label>
                      <Select value={difficulty} onValueChange={(value) => setDifficulty(value as typeof difficulty)}>
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
                </TabsContent>

                <TabsContent value="custom" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Subject</label>
                        <Select value={subject} onValueChange={setSubject}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Study</SelectItem>
                            <SelectItem value="science">Science</SelectItem>
                            <SelectItem value="history">History</SelectItem>
                            <SelectItem value="language">Language</SelectItem>
                            <SelectItem value="math">Mathematics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">Difficulty</label>
                        <Select value={difficulty} onValueChange={(value) => setDifficulty(value as typeof difficulty)}>
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

                      <div>
                        <label className="text-sm font-medium mb-2 block">Number of Cards</label>
                        <Select value={flashcardCount.toString()} onValueChange={(value) => setFlashcardCount(parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 cards</SelectItem>
                            <SelectItem value="10">10 cards</SelectItem>
                            <SelectItem value="15">15 cards</SelectItem>
                            <SelectItem value="20">20 cards</SelectItem>
                            <SelectItem value="30">30 cards</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">AI Model</label>
                        <Select value={apiProvider} onValueChange={(value) => setApiProvider(value as typeof apiProvider)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic (Claude)</SelectItem>
                            <SelectItem value="advanced">Advanced (GPT-4)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Focus Areas</label>
                        <div className="space-y-2">
                          {Object.entries(focusAreas).map(([key, value]) => (
                            <div key={key} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={key}
                                checked={value}
                                onChange={(e) => setFocusAreas(prev => ({
                                  ...prev,
                                  [key]: e.target.checked
                                }))}
                                className="rounded"
                              />
                              <label htmlFor={key} className="text-sm capitalize">
                                {key}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Custom Context (Optional)</label>
                      <Textarea
                        value={customContext}
                        onChange={(e) => setCustomContext(e.target.value)}
                        placeholder="Add specific instructions or context for flashcard generation..."
                        className="min-h-[80px]"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Custom Filename (Optional)</label>
                      <Input
                        value={customFileName}
                        onChange={(e) => setCustomFileName(e.target.value)}
                        placeholder="Enter a custom name for your flashcard set..."
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <Button onClick={handleGenerate} disabled={uploadMutation.isPending || reprocessMutation.isPending}>
                  {(uploadMutation.isPending || reprocessMutation.isPending) ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {selectedHistoricalFile ? 'Reprocessing...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      {selectedHistoricalFile ? 'Reprocess Historical PDF' : 'Generate Flashcards'}
                      <Sparkles className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Processing */}
        {currentStep === 3 && isProcessing && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto">
                  <Brain className="w-8 h-8 text-foreground animate-pulse" />
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-2">AI Processing</h3>
                  <p className="text-muted-foreground mb-4">{processingStage}</p>
                  
                  <Progress value={uploadProgress} className="w-full mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {uploadProgress}% complete
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-accent rounded-full"></div>
                      <span className="text-sm">Extracting content</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-muted rounded-full"></div>
                      <span className="text-sm text-muted-foreground">Processing text</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-muted rounded-full"></div>
                      <span className="text-sm text-muted-foreground">Generating cards</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Quality optimization</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Content analysis</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Final review</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button variant="outline" onClick={() => setLocation('/history')}>
                    Check History
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Start Over
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {currentStep === 4 && generatedFlashcards.length > 0 && (
          <div className="max-w-6xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Flashcards Generated</CardTitle>
                    <p className="text-muted-foreground">
                      {generatedFlashcards.length} cards ready for study
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewMode(previewMode === 'grid' ? 'list' : 'grid')}
                    >
                      {previewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3x3 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Button onClick={() => window.open(`/api/export/${currentJobId}/anki`, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Anki
                  </Button>
                  <Button variant="outline" onClick={() => window.open(`/api/export/${currentJobId}/csv`, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button variant="outline" onClick={() => {
                    if (currentJobId) {
                      setLocation(`/study/${currentJobId}`);
                    } else {
                      toast({
                        title: "Error",
                        description: "Job ID not found. Please try refreshing the page.",
                        variant: "destructive"
                      });
                    }
                  }}>
                    <Play className="w-4 h-4 mr-2" />
                    Start Studying
                  </Button>
                </div>

                <div className={previewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
                  {generatedFlashcards.slice(0, 4).map((card, index) => (
                    <Card key={index} className="bg-card border-border hover:border-accent transition-colors">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary">Card {index + 1}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigator.clipboard.writeText(`Q: ${card.front}\nA: ${card.back}`)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Question:</h4>
                            <p className="text-sm text-muted-foreground">{card.front}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground mb-2">Answer:</h4>
                            <p className="text-sm text-muted-foreground">{card.back}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {generatedFlashcards.length > 4 && (
                  <div className="text-center mt-4">
                    <p className="text-muted-foreground">
                      And {generatedFlashcards.length - 4} more cards...
                    </p>
                  </div>
                )}

                <div className="flex justify-center mt-6">
                  <Button onClick={resetForm}>
                    Create Another Set
                    <Plus className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}