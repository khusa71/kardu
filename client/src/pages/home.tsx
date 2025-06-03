import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FlashcardEditor } from "@/components/flashcard-editor";
import { StudyMode } from "@/components/study-mode";
import { AuthModal } from "@/components/auth-modal";
import { ResponsiveNavbar } from "@/components/responsive-navbar";
import { ResponsiveProgressStepper } from "@/components/responsive-progress-stepper";
import { ResponsiveUploadZone } from "@/components/responsive-upload-zone";
import { ResponsiveConfigPanel } from "@/components/responsive-config-panel";
import { Download, LoaderPinwheel, Check, Star, HelpCircle, ExternalLink, AlertCircle, RotateCcw, Edit, Play } from "lucide-react";
import type { FlashcardJob, FlashcardPair } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, sendVerificationEmail, refreshUserData } = useFirebaseAuth();
  
  // Form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Handle upload
  const handleUpload = useCallback(() => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a PDF file to continue.",
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
    formData.append('pdf', selectedFile);
    formData.append('apiProvider', apiProvider);
    formData.append('flashcardCount', flashcardCount.toString());
    formData.append('subject', subject);
    formData.append('focusAreas', JSON.stringify(focusAreas));
    formData.append('difficulty', difficulty);

    uploadMutation.mutate(formData);
  }, [selectedFile, apiProvider, flashcardCount, focusAreas, difficulty, uploadMutation, user, toast]);

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

  // Advance step when file is selected
  useEffect(() => {
    if (selectedFile && currentStep === 1) {
      setCurrentStep(2);
    } else if (!selectedFile && currentStep > 1) {
      setCurrentStep(1);
    }
  }, [selectedFile, currentStep]);

  // Check if user can upload based on premium status or upload limit
  const userUploads = (user as any)?.monthlyUploads || 0;
  const userLimit = (user as any)?.monthlyLimit || 3;
  const isPremium = (user as any)?.isPremium || false;
  const isEmailVerified = (user as any)?.isEmailVerified || false;
  
  const canUpload = user && (isPremium || userUploads < userLimit) && isEmailVerified;
  const isGenerateDisabled = !selectedFile || !canUpload || uploadMutation.isPending;

  // Debug logging for upload status
  console.log('Debug upload status:', {
    user: user ? {
      isPremium: (user as any).isPremium,
      monthlyUploads: (user as any).monthlyUploads,
      monthlyLimit: (user as any).monthlyLimit,
      isEmailVerified: (user as any).isEmailVerified
    } : null,
    selectedFile: !!selectedFile,
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
      {/* Responsive Header */}
      <ResponsiveNavbar 
        onAuthModalOpen={() => setShowAuthModal(true)}
        onLogout={handleLogout}
      />

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
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              onFileRemove={() => setSelectedFile(null)}
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
              disabled={currentStep < 2}
            />

            {/* Generate Button */}
            {selectedFile && currentStep >= 2 && (
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
                        {user && isEmailVerified && !selectedFile && <div>• Please select a PDF file</div>}
                        <div className="mt-2 text-xs opacity-75">
                          Debug: uploads={userUploads}, limit={userLimit}, premium={isPremium ? 'yes' : 'no'}, verified={isEmailVerified ? 'yes' : 'no'}
                        </div>
                      </div>
                    </div>
                  )}
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
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button onClick={() => setViewMode('edit')} variant="outline">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Cards
                        </Button>
                        <Button onClick={() => setViewMode('study')}>
                          <Play className="w-4 h-4 mr-2" />
                          Study Now
                        </Button>
                        <Button variant="outline" asChild>
                          <a href={`/api/download/${jobStatus.id}`} download>
                            <Download className="w-4 h-4 mr-2" />
                            Download Anki
                          </a>
                        </Button>
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
    </div>
  );
}