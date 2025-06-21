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
  Clock,
  BookOpen,
  Lightbulb,
  Sparkles,
  Play,
  Download,
  Edit,
  Eye,
  Grid3x3,
  List,
  ExternalLink
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

  // Deep state debugging
  useEffect(() => {
    console.log('🔄 currentStep changed to:', currentStep);
  }, [currentStep]);

  useEffect(() => {
    console.log('🔄 isProcessing changed to:', isProcessing);
  }, [isProcessing]);

  useEffect(() => {
    console.log('🔄 currentJobId changed to:', currentJobId);
  }, [currentJobId]);
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
      console.log('=== UPLOAD SUCCESS ===');
      console.log('Full upload response:', JSON.stringify(data, null, 2));
      
      const jobId = data.jobs && data.jobs.length > 0 ? data.jobs[0].jobId : data.jobId;
      console.log('Extracted job ID:', jobId);
      console.log('Setting currentJobId state to:', jobId);
      console.log('Setting currentStep to: 3');
      console.log('Setting isProcessing to: true');
      
      setCurrentJobId(jobId);
      setCurrentStep(3);
      setIsProcessing(true);
      
      console.log('State update complete, upload success toast showing');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <NavigationBar />
      
      <main className="max-w-screen-xl mx-auto px-4 pt-4 pb-16">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Create Smart Flashcards
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your PDFs into AI-powered flashcards in minutes. Upload, customize, and study smarter.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { step: 1, label: "Upload", icon: UploadIcon },
              { step: 2, label: "Configure", icon: Settings },
              { step: 3, label: "Process", icon: Zap },
              { step: 4, label: "Study", icon: BookOpen }
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                  currentStep >= item.step 
                    ? 'bg-primary border-primary text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {currentStep > item.step ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <item.icon className="w-6 h-6" />
                  )}
                </div>
                <span className={`ml-2 font-medium ${
                  currentStep >= item.step ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {item.label}
                </span>
                {index < 3 && (
                  <ArrowRight className="w-5 h-5 text-gray-300 mx-4" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl flex items-center justify-center gap-3">
                  <UploadIcon className="w-7 h-7 text-primary" />
                  Upload Your PDF
                </CardTitle>
                <p className="text-muted-foreground">
                  Select the PDF documents you want to convert into flashcards
                </p>
              </CardHeader>
              <CardContent>
                <div 
                  className="group relative border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-2xl p-12 text-center hover:border-blue-400 dark:hover:border-blue-600 transition-all duration-300 cursor-pointer bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-xl hover:scale-[1.02]"
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl"></div>
                  </div>
                  
                  <div className="relative flex flex-col items-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                        <FileText className="w-10 h-10 text-white" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Drop your PDF here
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                        Drag and drop your PDF files or click to browse. We'll transform them into intelligent flashcards.
                      </p>
                      
                      <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400 pt-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          PDF only
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Max {isPremium ? '10' : '1'} file{isPremium ? 's' : ''}
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          Up to 100 pages
                        </div>
                      </div>
                    </div>
                    
                    <Button size="lg" className="px-10 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300">
                      <UploadIcon className="w-5 h-5 mr-3" />
                      Choose Files
                    </Button>
                  </div>
                  
                  {/* Animated Border Glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-indigo-400 blur-sm"></div>
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
                  <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-lg font-semibold text-green-900 dark:text-green-100">
                        Files Ready for Processing
                      </h4>
                    </div>
                    
                    <div className="space-y-3 mb-6">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="group flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-green-100 dark:border-green-800 hover:shadow-md transition-all duration-200">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shadow-md">
                              <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">{file.name}</p>
                              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                  Ready to process
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedFiles(files => files.filter((_, i) => i !== index));
                              if (selectedFiles.length === 1) setCurrentStep(1);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30"
                          >
                            <X className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={() => setCurrentStep(2)} 
                      size="lg"
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Settings className="w-5 h-5 mr-3" />
                      Configure AI Settings
                      <ArrowRight className="w-5 h-5 ml-3" />
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
              <CardContent className="space-y-8">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-12 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <TabsTrigger value="basic" className="h-10 font-semibold">Basic Settings</TabsTrigger>
                    <TabsTrigger value="advanced" className="h-10 font-semibold">Advanced Options</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-8 mt-8">
                    {/* Subject Selection */}
                    <div className="space-y-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <label className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            Subject Area
                          </label>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            Choose the field of study for optimized question generation
                          </p>
                        </div>
                      </div>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger className="h-14 text-lg font-medium bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 transition-colors">
                          <SelectValue placeholder="Select your subject area" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">🌍 General Knowledge</SelectItem>
                          <SelectItem value="programming">💻 Programming & Tech</SelectItem>
                          <SelectItem value="science">🧬 Science & Mathematics</SelectItem>
                          <SelectItem value="history">📚 History & Social Studies</SelectItem>
                          <SelectItem value="language">📝 Language & Literature</SelectItem>
                          <SelectItem value="business">💼 Business & Economics</SelectItem>
                          <SelectItem value="medicine">⚕️ Medicine & Health</SelectItem>
                          <SelectItem value="law">⚖️ Law & Legal Studies</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Difficulty Level */}
                    <div className="space-y-4 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <label className="text-lg font-semibold text-purple-900 dark:text-purple-100">
                            Difficulty Level
                          </label>
                          <p className="text-sm text-purple-700 dark:text-purple-300">
                            Adjust complexity based on your expertise level
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                          <Button
                            key={level}
                            variant={difficulty === level ? "default" : "outline"}
                            onClick={() => setDifficulty(level)}
                            className={`h-16 flex flex-col transition-all duration-300 ${
                              difficulty === level 
                                ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg scale-105' 
                                : 'hover:shadow-md hover:scale-102'
                            }`}
                          >
                            <span className="font-semibold text-base capitalize">{level}</span>
                            <span className="text-xs opacity-80 mt-1">
                              {level === 'beginner' && '📚 Simple & Clear'}
                              {level === 'intermediate' && '⚖️ Balanced Approach'}
                              {level === 'advanced' && '🎓 Detailed & Complex'}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Number of Cards */}
                    <div className="space-y-4 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <label className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                            Number of Flashcards
                          </label>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            More cards provide comprehensive coverage
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[5, 10, 15, 20].map((count) => (
                          <Button
                            key={count}
                            variant={flashcardCount === count ? "default" : "outline"}
                            onClick={() => setFlashcardCount(count)}
                            className={`h-14 text-lg font-semibold transition-all duration-300 ${
                              flashcardCount === count 
                                ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg scale-105' 
                                : 'hover:shadow-md hover:scale-102'
                            }`}
                          >
                            {count}
                          </Button>
                        ))}
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          value={flashcardCount}
                          onChange={(e) => setFlashcardCount(parseInt(e.target.value) || 10)}
                          className="h-14 text-lg font-medium bg-white dark:bg-gray-800 border-2 border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 transition-colors pl-12"
                          placeholder="Custom amount (1-50)"
                        />
                        <Settings className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="advanced" className="space-y-8 mt-8">
                    {/* AI Model Selection */}
                    <div className="space-y-4 p-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <label className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                            AI Model Quality
                          </label>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Choose the AI model that best fits your needs
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Button
                          variant={apiProvider === "basic" ? "default" : "outline"}
                          onClick={() => setApiProvider("basic")}
                          className={`h-20 flex flex-col transition-all duration-300 ${
                            apiProvider === "basic" 
                              ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-lg scale-105' 
                              : 'hover:shadow-md hover:scale-102'
                          }`}
                        >
                          <span className="font-semibold text-base">⚡ Standard</span>
                          <span className="text-xs opacity-80 mt-1">Fast & Reliable</span>
                          <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">Free</Badge>
                        </Button>
                        <Button
                          variant={apiProvider === "advanced" ? "default" : "outline"}
                          onClick={() => setApiProvider("advanced")}
                          className={`h-20 flex flex-col transition-all duration-300 ${
                            apiProvider === "advanced" 
                              ? 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-lg scale-105' 
                              : isPremium ? 'hover:shadow-md hover:scale-102' : 'opacity-50 cursor-not-allowed'
                          }`}
                          disabled={!isPremium}
                        >
                          <span className="font-semibold text-base">🚀 Premium</span>
                          <span className="text-xs opacity-80 mt-1">Advanced AI</span>
                          <Badge variant="default" className="mt-2 bg-purple-100 text-purple-800">Pro Only</Badge>
                        </Button>
                      </div>
                    </div>

                    {/* Focus Areas */}
                    <div className="space-y-4 p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <label className="text-lg font-semibold text-cyan-900 dark:text-cyan-100">
                            Focus Areas
                          </label>
                          <p className="text-sm text-cyan-700 dark:text-cyan-300">
                            Select what types of content to emphasize
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(focusAreas).map(([key, value]) => (
                          <Button
                            key={key}
                            variant={value ? "default" : "outline"}
                            onClick={() => setFocusAreas(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                            className={`h-14 flex items-center justify-center transition-all duration-300 ${
                              value 
                                ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg scale-105' 
                                : 'hover:shadow-md hover:scale-102'
                            }`}
                          >
                            <span className="capitalize font-semibold">{key}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Context */}
                    <div className="space-y-4 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <label className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                            Custom Instructions
                          </label>
                          <p className="text-sm text-indigo-700 dark:text-indigo-300">
                            Add specific guidance for AI generation (optional)
                          </p>
                        </div>
                      </div>
                      <Textarea
                        placeholder="e.g., Focus on key formulas, include examples, avoid technical jargon..."
                        value={customContext}
                        onChange={(e) => setCustomContext(e.target.value)}
                        rows={4}
                        className="resize-none h-20 text-base bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 transition-colors"
                      />
                    </div>

                    {/* Custom File Name */}
                    <div className="space-y-4 p-6 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl border border-rose-200 dark:border-rose-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <label className="text-lg font-semibold text-rose-900 dark:text-rose-100">
                            Custom File Name
                          </label>
                          <p className="text-sm text-rose-700 dark:text-rose-300">
                            Give your flashcard set a memorable name (optional)
                          </p>
                        </div>
                      </div>
                      <div className="relative">
                        <Input
                          placeholder="e.g., Biology Chapter 5, JavaScript Fundamentals, etc."
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          className="h-14 text-lg font-medium bg-white dark:bg-gray-800 border-2 border-rose-200 dark:border-rose-700 hover:border-rose-400 transition-colors pl-12"
                        />
                        <FileText className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-rose-600" />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Separator />

                {/* Enhanced Action Bar */}
                <div className="mt-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setCurrentStep(1)}
                      className="flex-1 h-14 text-base font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                    >
                      <ArrowRight className="w-5 h-5 mr-2 rotate-180" />
                      Back to Upload
                    </Button>
                    <Button 
                      onClick={handleGenerate}
                      disabled={uploadMutation.isPending}
                      className="flex-1 h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          Creating Magic...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-6 h-6 mr-3" />
                          Start AI Processing
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {/* Processing Preview */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Ready to process {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Est. 2-3 minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Processing */}
          {currentStep === 3 && (
            <Card className="shadow-xl border-0">
              <CardContent className="py-12">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">
                      Creating Your Flashcards
                    </h3>
                    <p className="text-muted-foreground text-lg">
                      Our AI is analyzing your PDF and generating smart flashcards...
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{jobStatus ? (jobStatus as any)?.progress || 0 : 0}%</span>
                    </div>
                    <Progress value={jobStatus ? (jobStatus as any)?.progress || 0 : 0} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      Status: {jobStatus ? (jobStatus as any)?.status || 'Processing...' : 'Processing...'}
                    </p>
                    
                    <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <div className="space-y-5">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            AI Processing Your PDF
                          </h3>
                          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-3 py-1 rounded-full">
                            {Math.round(((jobStatus as any)?.progress || 0))}% Complete
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">PDF parsed and text extracted</span>
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Content analyzed and chunked intelligently</span>
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">Key concepts and topics identified</span>
                            <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className={`w-2 h-2 rounded-full ${(jobStatus as any)?.status === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {(jobStatus as any)?.status === 'processing' 
                                ? 'AI generating intelligent questions and answers...' 
                                : 'AI flashcard generation complete'}
                            </span>
                            {(jobStatus as any)?.status === 'processing' ? (
                              <Loader2 className="w-4 h-4 text-yellow-500 animate-spin ml-auto" />
                            ) : (
                              <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-3 text-sm">
                            <div className={`w-2 h-2 rounded-full ${(jobStatus as any)?.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {(jobStatus as any)?.status === 'completed' 
                                ? `${((jobStatus as any)?.flashcards?.length || 0)} flashcards ready for study` 
                                : 'Finalizing your study deck...'}
                            </span>
                            {(jobStatus as any)?.status === 'completed' && (
                              <Sparkles className="w-4 h-4 text-green-500 ml-auto" />
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-5 pt-4 border-t border-blue-200 dark:border-blue-700">
                          <div className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
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
            <Card className="shadow-xl border-0">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl flex items-center justify-center gap-3">
                  <CheckCircle className="w-7 h-7 text-green-500" />
                  Flashcards Generated Successfully!
                </CardTitle>
                <p className="text-muted-foreground">
                  Created {generatedFlashcards.length} flashcards from your PDF
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Action Bar */}
                <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-blue-900 dark:text-blue-100 mb-2">Your Flashcard Set</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {generatedFlashcards.length} cards ready for study • Created from your PDF
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Download Options */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/export/${currentJobId}/anki`, '_blank')}
                        className="h-9"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        Anki
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/export/${currentJobId}/csv`, '_blank')}
                        className="h-9"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/export/${currentJobId}/json`, '_blank')}
                        className="h-9"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        JSON
                      </Button>
                    </div>
                    
                    {/* Edit Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/edit/${currentJobId}`)}
                      className="h-9"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit Cards
                    </Button>
                  </div>
                </div>

                {/* Preview Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant={previewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('grid')}
                    >
                      <Grid3x3 className="w-4 h-4 mr-1" />
                      Grid
                    </Button>
                    <Button
                      variant={previewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('list')}
                    >
                      <List className="w-4 h-4 mr-1" />
                      List
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    Previewing {Math.min(6, generatedFlashcards.length)} of {generatedFlashcards.length} cards
                  </Badge>
                </div>

                {/* Enhanced Flashcard Preview */}
                <div className={previewMode === 'grid' 
                  ? 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6' 
                  : 'space-y-6'
                }>
                  {generatedFlashcards.slice(0, 6).map((card, index) => (
                    <div key={index} className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300">
                      <div className="space-y-4">
                        <div className="relative">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                              Question {index + 1}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  navigator.clipboard.writeText(`Q: ${card.front}\nA: ${card.back}`);
                                  toast({ title: "Copied to clipboard" });
                                }}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-relaxed">{card.front}</p>
                        </div>
                        
                        <div className="relative">
                          <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent my-3"></div>
                          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                              <ArrowRight className="w-3 h-3 text-white rotate-90" />
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                            Answer
                          </span>
                          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-2">{card.back}</p>
                        </div>
                      </div>
                      
                      {/* Card Number Indicator */}
                      <div className="absolute top-3 right-3 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{index + 1}</span>
                      </div>
                    </div>
                  ))}
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
                <div className="flex justify-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-muted-foreground">
                    Need help? Visit our{" "}
                    <Button variant="link" className="p-0 h-auto text-sm">
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