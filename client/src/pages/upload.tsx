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
  Play
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
      setCurrentJobId(data.jobId);
      setCurrentStep(3);
      setIsProcessing(true);
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

  // Job status polling
  const { data: jobStatus } = useQuery({
    queryKey: ['/api/jobs', currentJobId],
    enabled: !!currentJobId && isProcessing,
    refetchInterval: 2000,
  });

  // Handle job completion
  useEffect(() => {
    if (jobStatus && (jobStatus as any).status === 'completed' && (jobStatus as any).flashcards) {
      let flashcards: FlashcardPair[] = [];
      
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
      
      setGeneratedFlashcards(flashcards);
      setIsProcessing(false);
      setCurrentStep(4);
      
      toast({
        title: "Flashcards generated!",
        description: `Successfully created ${flashcards.length} flashcards.`,
      });
    }
  }, [jobStatus, toast]);

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
                  className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-primary/5"
                  onClick={() => document.getElementById('file-input')?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Drop your PDF here or click to browse
                      </h3>
                      <p className="text-muted-foreground">
                        Supports multiple files • Max {isPremium ? '10' : '1'} file{isPremium ? 's' : ''} • PDF only
                      </p>
                    </div>
                    <Button size="lg" className="px-8">
                      <Plus className="w-5 h-5 mr-2" />
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
                {/* Preview Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant={previewMode === 'grid' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('grid')}
                    >
                      Grid View
                    </Button>
                    <Button
                      variant={previewMode === 'list' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setPreviewMode('list')}
                    >
                      List View
                    </Button>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {generatedFlashcards.length} cards
                  </Badge>
                </div>

                {/* Flashcard Preview */}
                <div className={previewMode === 'grid' 
                  ? 'grid grid-cols-1 md:grid-cols-2 gap-4' 
                  : 'space-y-4'
                }>
                  {generatedFlashcards.slice(0, 6).map((card, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Question</p>
                          <p className="font-medium text-foreground">{card.front}</p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Answer</p>
                          <p className="text-foreground">{card.back}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {generatedFlashcards.length > 6 && (
                  <p className="text-center text-muted-foreground">
                    And {generatedFlashcards.length - 6} more flashcards...
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={resetForm}
                    className="flex-1 h-12"
                  >
                    Create New Set
                  </Button>
                  <Button 
                    onClick={() => setLocation(`/study/${currentJobId}`)}
                    className="flex-1 h-12 text-lg"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Studying
                  </Button>
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