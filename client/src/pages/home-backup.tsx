import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NavigationBar } from "@/components/navigation-bar";
import { AuthModal } from "@/components/auth-modal";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Link } from "wouter";
import { BookOpen, Upload, FileText, Zap, Star, Users, CheckCircle, ArrowRight, Brain, Target, Clock } from "lucide-react";

export default function Home() {
  const { user, loading } = useFirebaseAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <NavigationBar />
      
      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-primary text-white rounded-full p-4">
              <Brain className="w-12 h-12" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Transform PDFs into
            <span className="block text-primary">Interactive Flashcards</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            Upload your educational PDFs and let AI generate personalized flashcards instantly. 
            Perfect for students, professionals, and lifelong learners.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <Link href="/upload">
                <Button size="lg" className="text-lg px-8 py-3">
                  <Upload className="w-5 h-5 mr-2" />
                  Start Creating Flashcards
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <Button size="lg" className="text-lg px-8 py-3" onClick={() => setShowAuthModal(true)}>
                <Upload className="w-5 h-5 mr-2" />
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            
            {user && (
              <Link href="/history">
                <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                  <FileText className="w-5 h-5 mr-2" />
                  View My Files
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Generation</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Advanced AI analyzes your PDFs and creates relevant, high-quality flashcards automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="bg-green-100 dark:bg-green-900 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Customizable Focus</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose what to focus on - concepts, definitions, examples, or procedures.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="p-6">
              <div className="bg-purple-100 dark:bg-purple-900 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Study Tracking</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Track your progress and focus on cards that need more practice.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">1</div>
              <h3 className="text-lg font-semibold mb-2">Upload PDF</h3>
              <p className="text-gray-600 dark:text-gray-400">Upload your educational materials or study guides</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">2</div>
              <h3 className="text-lg font-semibold mb-2">AI Processing</h3>
              <p className="text-gray-600 dark:text-gray-400">Our AI analyzes content and generates flashcards</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-primary text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mb-4">3</div>
              <h3 className="text-lg font-semibold mb-2">Start Learning</h3>
              <p className="text-gray-600 dark:text-gray-400">Study with interactive flashcards and track progress</p>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Free Plan</span>
                <Badge variant="secondary">Current</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">$0<span className="text-lg text-gray-500">/month</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>3 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Basic AI processing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Standard export formats</span>
                </li>
              </ul>
              {!user && (
                <Button className="w-full" onClick={() => setShowAuthModal(true)}>
                  Get Started Free
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="relative border-primary">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-white">Most Popular</Badge>
            </div>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pro Plan</span>
                <Star className="w-5 h-5 text-yellow-500" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-4">$9.99<span className="text-lg text-gray-500">/month</span></div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>100 PDF uploads per month</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Advanced AI processing</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Multiple export formats</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Button className="w-full" onClick={() => user ? window.open('/api/create-checkout-session', '_blank') : setShowAuthModal(true)}>
                {user ? 'Upgrade to Pro' : 'Sign Up for Pro'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
  const [apiProvider, setApiProvider] = useState<"openai" | "anthropic">("anthropic");
  const [flashcardCount, setFlashcardCount] = useState(25);
  
  // Subject and focus areas
  const [subject, setSubject] = useState<string>("programming");
  const [focusAreas, setFocusAreas] = useState({
    concepts: true,
    definitions: true,
    examples: false,
    procedures: false,
  });
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [customContext, setCustomContext] = useState<string>("");
  
  // Processing state
  const [currentJobId, setCurrentJobId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [previewFlashcards, setPreviewFlashcards] = useState<FlashcardPair[]>([]);
  const [showAllFlashcards, setShowAllFlashcards] = useState(false);
  const [viewMode, setViewMode] = useState<'upload' | 'edit' | 'study'>('upload');
  const [editableFlashcards, setEditableFlashcards] = useState<FlashcardPair[]>([]);
  
  // User status states
  const [showEmailVerificationMessage, setShowEmailVerificationMessage] = useState(false);
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMyFilesModal, setShowMyFilesModal] = useState(false);

  // Poll for job status
  const { data: jobStatus } = useQuery<FlashcardJob>({
    queryKey: [`/api/jobs/${currentJobId}`],
    enabled: !!currentJobId,
    refetchInterval: currentJobId ? 2000 : false,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/upload", formData);
      return response.json();
    },
    onSuccess: async (data) => {
      setCurrentJobId(data.jobId);
      setCurrentStep(3);
      
      // Refresh user data to update upload counter
      await refreshUserData();
      
      toast({
        title: "Upload successful",
        description: "Your PDF is being processed...",
      });
    },
    onError: (error: any) => {
      // Handle specific error types
      if (error.message.includes("verify your email")) {
        setShowEmailVerificationMessage(true);
        toast({
          title: "Email verification required",
          description: "Please verify your email to continue generating flashcards.",
          variant: "destructive",
        });
      } else if (error.message.includes("monthly limit")) {
        setShowUpgradeBanner(true);
        toast({
          title: "Upload limit reached",
          description: "You've reached your monthly limit. Upgrade to generate more flashcards.",
          variant: "destructive",
        });
      } else if (error.message?.includes('401')) {
        toast({
          title: "Authentication required",
          description: "Please sign in to continue.",
          variant: "destructive",
        });
        setShowAuthModal(true);
      } else {
        toast({
          title: "Upload failed",
          description: error.message || "Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Handle upload - updated for multiple files
  const handleUpload = useCallback(() => {
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select PDF files to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to continue generating flashcards.",
        variant: "destructive",
      });
      setShowAuthModal(true);
      return;
    }

    const formData = new FormData();
    
    // Append multiple PDF files
    selectedFiles.forEach(file => {
      formData.append('pdfs', file);
    });
    
    formData.append('apiProvider', apiProvider);
    formData.append('flashcardCount', flashcardCount.toString());
    formData.append('subject', subject);
    formData.append('focusAreas', JSON.stringify(focusAreas));
    formData.append('difficulty', difficulty);
    formData.append('customContext', customContext);

    uploadMutation.mutate(formData);
  }, [selectedFiles, apiProvider, flashcardCount, focusAreas, difficulty, uploadMutation, user, toast]);

  // Handle authentication state changes
  useEffect(() => {
    if (user && !(user as any).isEmailVerified) {
      setShowEmailVerificationMessage(true);
    } else {
      setShowEmailVerificationMessage(false);
    }

    if (user && (user as any).monthlyUploads >= (user as any).monthlyLimit && !(user as any).isPremium) {
      setShowUpgradeBanner(true);
    } else {
      setShowUpgradeBanner(false);
    }
  }, [user]);

  // Advance step when files are selected
  useEffect(() => {
    if (selectedFiles.length > 0 && currentStep === 1) {
      setCurrentStep(2);
    } else if (selectedFiles.length === 0 && currentStep > 1) {
      setCurrentStep(1);
    }
  }, [selectedFiles, currentStep]);

  // Check if user can upload based on premium status or upload limit
  const userUploads = (user as any)?.monthlyUploads || 0;
  const userLimit = (user as any)?.monthlyLimit || 3;
  const isPremium = (user as any)?.isPremium || false;
  const isEmailVerified = (user as any)?.isEmailVerified || false;
  
  const canUpload = user && (isPremium || userUploads < userLimit) && isEmailVerified;
  const isGenerateDisabled = selectedFiles.length === 0 || !canUpload || uploadMutation.isPending;

  // Debug logging for upload status
  console.log('Debug upload status:', {
    user: user ? {
      isPremium: (user as any).isPremium,
      monthlyUploads: (user as any).monthlyUploads,
      monthlyLimit: (user as any).monthlyLimit,
      isEmailVerified: (user as any).isEmailVerified
    } : null,
    selectedFiles: selectedFiles.length,
    canUpload,
    isGenerateDisabled,
    uploadMutationPending: uploadMutation.isPending
  });

  // Update UI based on job status
  if (jobStatus) {
    if (jobStatus.status === 'completed' && currentStep < 4) {
      setCurrentStep(4);
      const allFlashcards = JSON.parse(jobStatus.flashcards || '[]');
      setPreviewFlashcards(allFlashcards.slice(0, 3));
      setEditableFlashcards(allFlashcards);
    }
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      });
    } catch (error) {
      toast({
        title: "Sign out failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Render different views based on mode
  if (viewMode === 'edit' && editableFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => setViewMode('upload')}>
                  ← Back to Upload
                </Button>
                <h1 className="text-xl font-bold">Edit Flashcards</h1>
              </div>
              <Button onClick={() => setViewMode('study')} className="flex items-center">
                <Play className="w-4 h-4 mr-2" />
                Start Study Mode
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <FlashcardEditor
            flashcards={editableFlashcards}
            onFlashcardsChange={setEditableFlashcards}
          />
        </main>
      </div>
    );
  }

  if (viewMode === 'study' && editableFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="h-screen">
          <StudyMode
            flashcards={editableFlashcards}
            onComplete={(results) => {
              toast({
                title: "Study session complete!",
                description: `Accuracy: ${Math.round(results.accuracy)}% • Time: ${Math.round(results.timeSpent)} min`,
              });
              setViewMode('edit');
            }}
            onExit={() => setViewMode('edit')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Navigation Bar */}
      <NavigationBar />
      
      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
        {/* Email Verification Alert */}
        {user && !isEmailVerified && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Email verification required
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Please verify your email address to generate flashcards. Check your inbox and spam folder.
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={async () => {
                  try {
                    await sendVerificationEmail();
                    toast({
                      title: "Verification email sent",
                      description: "Please check your inbox and spam folder.",
                    });
                  } catch (error) {
                    toast({
                      title: "Failed to send email",
                      description: "Please try again later.",
                      variant: "destructive",
                    });
                  }
                }}
                className="ml-4"
              >
                Resend Email
              </Button>
            </div>
          </div>
        )}

        {/* Responsive Progress Steps */}
        <ResponsiveProgressStepper currentStep={currentStep} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
          {/* Main Workflow */}
          <div className="lg:col-span-2 space-y-4 lg:space-y-8">
            
            {/* Step 1: PDF Upload */}
            <ResponsiveUploadZone 
              selectedFiles={selectedFiles}
              onFilesSelect={setSelectedFiles}
              onFileRemove={(index: number) => {
                setSelectedFiles(files => files.filter((_, i) => i !== index));
              }}
              onFileReuse={(job) => {
                setCurrentJobId(job.id);
                setCurrentStep(3);
              }}
              isPremium={isPremium}
              maxFiles={isPremium ? 10 : 1}
            />

            {/* Step 2: Configuration */}
            <ResponsiveConfigPanel 
              apiProvider={apiProvider}
              onApiProviderChange={setApiProvider}
              flashcardCount={flashcardCount}
              onFlashcardCountChange={setFlashcardCount}
              subject={subject}
              onSubjectChange={setSubject}
              focusAreas={focusAreas}
              onFocusAreasChange={setFocusAreas}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              customContext={customContext}
              onCustomContextChange={setCustomContext}
              disabled={currentStep < 2}
            />

            {/* Generate Button */}
            {selectedFiles.length > 0 && currentStep >= 2 && (
              <Card>
                <CardContent className="p-4 lg:p-8 text-center">
                  <Button 
                    onClick={handleUpload}
                    disabled={isGenerateDisabled || currentStep >= 3}
                    size="lg"
                    className="w-full sm:w-auto px-8 py-3 text-lg font-semibold"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <LoaderPinwheel className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Generate Flashcards
                      </>
                    )}
                  </Button>
                  
                  {/* Debug info and helpful messages */}
                  {isGenerateDisabled && !uploadMutation.isPending && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <div className="font-medium mb-2">Generate button is disabled:</div>
                        {!user && <div>• Please sign in to continue</div>}
                        {user && !isEmailVerified && (
                          <div className="space-y-2">
                            <div>• Please verify your email address</div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await sendVerificationEmail();
                                  toast({
                                    title: "Verification email sent",
                                    description: "Please check your inbox and spam folder.",
                                  });
                                } catch (error) {
                                  toast({
                                    title: "Failed to send email",
                                    description: "Please try again later.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="text-xs"
                            >
                              Resend Verification Email
                            </Button>
                          </div>
                        )}
                        {user && isEmailVerified && userUploads >= userLimit && !isPremium && (
                          <div>• Upload limit reached ({userUploads}/{userLimit}). Upgrade to Pro for more uploads.</div>
                        )}
                        {user && isEmailVerified && selectedFiles.length === 0 && <div>• Please select PDF files</div>}
                        <div className="mt-2 text-xs opacity-75">
                          Debug: uploads={userUploads}, limit={userLimit}, premium={isPremium ? 'yes' : 'no'}, verified={isEmailVerified ? 'yes' : 'no'}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Configuration Summary */}
            {currentStep >= 3 && (
              <Card>
                <CardContent className="p-4 lg:p-6">
                  <h3 className="text-lg font-semibold mb-3">Generation Settings Applied</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Cards Requested:</span>
                      <Badge variant="outline" className="ml-2">{flashcardCount}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">AI Provider:</span>
                      <Badge variant="outline" className="ml-2">{apiProvider === 'openai' ? 'OpenAI (GPT-4)' : 'Anthropic (Claude)'}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Subject:</span>
                      <Badge variant="outline" className="ml-2">{subject}</Badge>
                    </div>
                    <div>
                      <span className="font-medium">Difficulty:</span>
                      <Badge variant="outline" className="ml-2">{difficulty}</Badge>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="font-medium text-sm">Focus Areas:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(focusAreas).filter(([_, enabled]) => enabled).map(([area, _]) => (
                        <Badge key={area} variant="secondary" className="text-xs">
                          {area.charAt(0).toUpperCase() + area.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Processing Status */}
            {currentStep >= 3 && jobStatus && (
              <Card>
                <CardContent className="p-4 lg:p-8">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-3">
                      {jobStatus.status === 'completed' ? (
                        <Check className="w-6 h-6 text-green-500" />
                      ) : (
                        <LoaderPinwheel className="w-6 h-6 text-primary animate-spin" />
                      )}
                      <h3 className="text-lg font-semibold">
                        {jobStatus.status === 'completed' ? 'Flashcards Ready!' : 'Processing...'}
                      </h3>
                    </div>
                    
                    <div className="space-y-2">
                      <Progress value={jobStatus.progress} className="w-full" />
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {jobStatus.currentTask}
                      </p>
                    </div>

                    {jobStatus.status === 'completed' && (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                          <Button onClick={() => setViewMode('edit')} variant="outline">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Cards
                          </Button>
                          <Button onClick={() => setViewMode('study')}>
                            <Play className="w-4 h-4 mr-2" />
                            Study Now
                          </Button>
                        </div>
                        
                        {/* Export Buttons */}
                        <div className="border-t pt-4">
                          <h4 className="text-sm font-medium text-center mb-3 text-gray-600 dark:text-gray-300">
                            Download Formats
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {jobStatus.ankiDownloadUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={jobStatus.ankiDownloadUrl} download>
                                  <Download className="w-3 h-3 mr-1" />
                                  Anki (.apkg)
                                </a>
                              </Button>
                            )}
                            {jobStatus.csvDownloadUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={jobStatus.csvDownloadUrl} download>
                                  <Download className="w-3 h-3 mr-1" />
                                  CSV
                                </a>
                              </Button>
                            )}
                            {jobStatus.jsonDownloadUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={jobStatus.jsonDownloadUrl} download>
                                  <Download className="w-3 h-3 mr-1" />
                                  JSON
                                </a>
                              </Button>
                            )}
                            {jobStatus.quizletDownloadUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={jobStatus.quizletDownloadUrl} download>
                                  <Download className="w-3 h-3 mr-1" />
                                  Quizlet
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6">
            {/* Subscription Status Card */}
            {user && (user as any).isPremium ? (
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center mb-4">
                    <Star className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="font-semibold text-green-800 dark:text-green-200">Pro User</h3>
                    <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
                    <li>• 100 uploads per month</li>
                    <li>• Advanced AI processing</li>
                    <li>• Multiple export formats</li>
                    <li>• Priority support</li>
                  </ul>
                  <div className="mt-4 text-sm text-green-600 dark:text-green-400">
                    {(user as any).monthlyUploads}/{(user as any).monthlyLimit} uploads used this month
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 lg:p-6">
                  <div className="flex items-center mb-4">
                    <Star className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="font-semibold text-purple-800 dark:text-purple-200">Free Plan</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-purple-700 dark:text-purple-300">
                    <li>• 3 uploads per month</li>
                    <li>• Basic AI processing</li>
                    <li>• Standard export formats</li>
                    <li>• Community support</li>
                  </ul>
                  {user ? (
                    <div className="mt-4 space-y-2">
                      <div className="text-sm text-purple-600 dark:text-purple-400">
                        {(user as any).monthlyUploads || 0}/{(user as any).monthlyLimit || 3} uploads used
                      </div>
                      <Button 
                        className="w-full" 
                        size="sm"
                        onClick={() => window.open('/api/create-checkout-session', '_blank')}
                      >
                        Upgrade to Pro - $9.99/month
                      </Button>
                    </div>
                  ) : (
                    <Button className="w-full mt-4" size="sm" onClick={() => setShowAuthModal(true)}>
                      Sign in to upgrade
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Help Card */}
            <Card>
              <CardContent className="p-4 lg:p-6">
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

      {/* Authentication Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      
      {/* My Files Modal */}
      <MyFilesModal 
        isOpen={showMyFilesModal} 
        onClose={() => setShowMyFilesModal(false)}
        onFileSelect={(job) => {
          // Handle file selection for regeneration
          setCurrentJobId(job.id);
          setCurrentStep(3);
          setShowMyFilesModal(false);
        }}
      />
    </div>
  );
}