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
import { NavigationBar } from "@/components/navigation-bar";
import { ResponsiveNavbar } from "@/components/responsive-navbar";
import { ResponsiveProgressStepper } from "@/components/responsive-progress-stepper";
import { ResponsiveUploadZone } from "@/components/responsive-upload-zone";
import { ResponsiveConfigPanel } from "@/components/responsive-config-panel";
import { MyFilesModal } from "@/components/my-files-modal";
import { QuotaStatus } from "@/components/quota-status";
import { Download, LoaderPinwheel, Check, Star, HelpCircle, ExternalLink, AlertCircle, RotateCcw, Edit, Play } from "lucide-react";
import type { FlashcardJob, FlashcardPair } from "@shared/schema";

export default function Upload() {
  const { toast } = useToast();
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, logout, sendVerificationEmail, refreshUserData } = useFirebaseAuth();
  
  // Form state - updated for multiple files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedStorageFile, setSelectedStorageFile] = useState<any>(null);
  const [apiProvider, setApiProvider] = useState<"basic" | "advanced">("basic");
  const [flashcardCount, setFlashcardCount] = useState(5);
  const [customFileName, setCustomFileName] = useState<string>("");
  const [customFlashcardSetName, setCustomFlashcardSetName] = useState<string>("");
  
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
      // Handle multiple jobs response
      if (data.jobs && data.jobs.length > 0) {
        setCurrentJobId(data.jobs[0].jobId);
      } else if (data.jobId) {
        setCurrentJobId(data.jobId);
      }
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
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      }
    },
  });

  // Map AI quality tiers to actual providers
  const getActualProvider = (tier: "basic" | "advanced"): "openai" | "anthropic" => {
    switch (tier) {
      case "basic":
        return "anthropic"; // Claude 3.5 Haiku
      case "advanced":
        return "openai"; // GPT-4o Mini
      default:
        return "anthropic";
    }
  };

  // Handle file generation
  const handleGenerate = useCallback(() => {
    // Validate inputs
    if (selectedFiles.length === 0 && !selectedStorageFile) {
      toast({
        title: "No files selected",
        description: "Please select at least one PDF file or choose from your files.",
        variant: "destructive",
      });
      return;
    }

    // Validate flashcard count
    if (flashcardCount < 1 || flashcardCount > 100) {
      toast({
        title: "Invalid flashcard count",
        description: "Please select between 1 and 100 flashcards.",
        variant: "destructive",
      });
      return;
    }

    // Validate subject
    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please specify a subject for your flashcards.",
        variant: "destructive",
      });
      return;
    }

    // Validate premium access for advanced models
    if (apiProvider === 'advanced' && !isPremium) {
      toast({
        title: "Premium required",
        description: "Advanced AI quality requires a Premium subscription.",
        variant: "destructive",
      });
      return;
    }

    // Handle storage file regeneration
    if (selectedStorageFile && selectedFiles.length === 0) {
      // Use regeneration API for storage files
      const regenerateData = {
        customContext: customContext.trim() || undefined,
        customFileName: customFileName.trim() || undefined,
        customFlashcardSetName: customFlashcardSetName.trim() || undefined,
        subject,
        difficulty,
        flashcardCount,
        apiProvider: apiProvider,
        focusAreas
      };

      fetch(`/api/regenerate/${selectedStorageFile.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(regenerateData),
      })
      .then(response => response.json())
      .then(data => {
        setCurrentJobId(data.jobId || selectedStorageFile.id);
        setCurrentStep(3);
        toast({
          title: "Regeneration started",
          description: "Your flashcards are being regenerated...",
        });
      })
      .catch(error => {
        toast({
          title: "Regeneration failed",
          description: error.message || "Please try again later.",
          variant: "destructive",
        });
      });
      return;
    }

    // Create form data with all files and settings
    const formData = new FormData();
    selectedFiles.forEach((file, index) => {
      formData.append(`pdfs`, file);
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
    if (customFlashcardSetName.trim()) {
      formData.append('customFlashcardSetName', customFlashcardSetName);
    }

    uploadMutation.mutate(formData);
  }, [selectedFiles, selectedStorageFile, subject, difficulty, flashcardCount, apiProvider, focusAreas, customContext, customFileName, customFlashcardSetName, uploadMutation, toast]);

  // Reset form
  const resetForm = () => {
    setSelectedFiles([]);
    setSelectedStorageFile(null);
    setCurrentStep(1);
    setCurrentJobId(null);
    setPreviewFlashcards([]);
    setShowAllFlashcards(false);
    setViewMode('upload');
    setEditableFlashcards([]);
    setCustomFileName("");
    setCustomFlashcardSetName("");
  };

  // Monitor job completion and load flashcards
  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobStatus.flashcards && viewMode === 'upload') {
      let flashcards: FlashcardPair[] = [];
      
      if (Array.isArray(jobStatus.flashcards)) {
        flashcards = jobStatus.flashcards;
      } else if (typeof jobStatus.flashcards === 'string') {
        try {
          const parsed = JSON.parse(jobStatus.flashcards);
          flashcards = Array.isArray(parsed) ? parsed : [];
        } catch (error) {
          console.error('Failed to parse flashcards:', error);
          flashcards = [];
        }
      }
      
      setPreviewFlashcards(flashcards.slice(0, 3));
      setEditableFlashcards(flashcards);
    }
  }, [jobStatus, viewMode]);

  // Check user upload limits
  useEffect(() => {
    if (!user) return;
    
    if (user && (user as any).monthlyUploads >= (user as any).monthlyLimit && !(user as any).isPremium) {
      setShowUpgradeBanner(true);
    } else {
      setShowUpgradeBanner(false);
    }
  }, [user]);

  // Advance step when files are selected
  useEffect(() => {
    if ((selectedFiles.length > 0 || selectedStorageFile) && currentStep === 1) {
      setCurrentStep(2);
    } else if (selectedFiles.length === 0 && !selectedStorageFile && currentStep > 1) {
      setCurrentStep(1);
    }
  }, [selectedFiles, selectedStorageFile, currentStep]);

  // Check if user can upload based on premium status or upload limit
  const userUploads = (user as any)?.monthlyUploads || 0;
  const userLimit = (user as any)?.monthlyLimit || 3;
  const isPremium = (user as any)?.isPremium || false;
  const isEmailVerified = (user as any)?.isEmailVerified || false;
  
  const canUpload = user && (isPremium || userUploads < userLimit) && isEmailVerified;
  const isGenerateDisabled = (selectedFiles.length === 0 && !selectedStorageFile) || !canUpload || uploadMutation.isPending;

  // Handle edit mode
  if (viewMode === 'edit') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <FlashcardEditor
            flashcards={editableFlashcards}
            onFlashcardsChange={setEditableFlashcards}
            onSave={async (updatedFlashcards) => {
              setEditableFlashcards(updatedFlashcards);
              setViewMode('upload');
              toast({
                title: "Flashcards updated",
                description: "Your changes have been saved.",
              });
            }}
            jobId={currentJobId || undefined}
          />
          <div className="mt-6 flex justify-center">
            <Button onClick={() => setViewMode('upload')} variant="outline">
              Back to Upload
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Handle study mode
  if (viewMode === 'study') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <StudyMode
            flashcards={editableFlashcards}
            onExit={() => setViewMode('upload')}
          />
        </main>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth modal
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <NavigationBar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="max-w-md">
            <CardContent className="text-center p-8">
              <h2 className="text-xl font-semibold mb-4">Sign in required</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please sign in to upload PDFs and generate flashcards.
              </p>
              <Button onClick={() => setShowAuthModal(true)}>
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
              onStorageFileSelect={setSelectedStorageFile}
              selectedStorageFile={selectedStorageFile}
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
              customFileName={customFileName}
              onCustomFileNameChange={setCustomFileName}
              customFlashcardSetName={customFlashcardSetName}
              onCustomFlashcardSetNameChange={setCustomFlashcardSetName}
              disabled={currentStep < 2}
              onGenerate={handleGenerate}
              isGenerateDisabled={isGenerateDisabled}
              isPending={uploadMutation.isPending}
              canUpload={canUpload}
              user={user}
              isEmailVerified={isEmailVerified}
              userUploads={userUploads}
              userLimit={userLimit}
              isPremium={isPremium}
              onAuthModalOpen={() => setShowAuthModal(true)}
              onSendVerificationEmail={sendVerificationEmail}
            />

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
                          <Button 
                            onClick={async () => {
                              try {
                                // Fetch complete job data with flashcards
                                const response = await fetch(`/api/jobs/${currentJobId}`, {
                                  method: 'GET',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                });
                                
                                if (!response.ok) {
                                  throw new Error(`Failed to fetch job data: ${response.statusText}`);
                                }
                                
                                const jobData = await response.json();
                                
                                if (jobData.flashcards) {
                                  const flashcards = JSON.parse(jobData.flashcards);
                                  
                                  // Transform data structure if needed (question/answer vs front/back)
                                  const normalizedFlashcards = flashcards.map((card: any) => ({
                                    id: card.id || Math.random(),
                                    front: card.front || card.question || '',
                                    back: card.back || card.answer || '',
                                    subject: card.subject || card.topic || '',
                                    difficulty: card.difficulty || 'beginner',
                                    tags: card.tags || []
                                  }));
                                  
                                  setEditableFlashcards(normalizedFlashcards);
                                  setViewMode('edit');
                                } else {
                                  toast({
                                    title: "No flashcards found",
                                    description: "Unable to load flashcards for editing.",
                                    variant: "destructive",
                                  });
                                }
                              } catch (error: any) {
                                toast({
                                  title: "Failed to load flashcards",
                                  description: error.message || "An error occurred while loading flashcards.",
                                  variant: "destructive",
                                });
                              }
                            }} 
                            variant="outline"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Cards
                          </Button>
                          <Button onClick={() => setViewMode('study')}>
                            <Play className="w-4 h-4 mr-2" />
                            Study Now
                          </Button>
                          <Button onClick={resetForm} variant="outline">
                            <RotateCcw className="w-4 h-4 mr-2" />
                            New Upload
                          </Button>
                        </div>
                        
                        {/* Download Options */}
                        <div className="flex flex-wrap gap-2 justify-center">
                          {jobStatus.ankiDownloadUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(jobStatus.ankiDownloadUrl, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Anki Deck
                            </Button>
                          )}
                          {jobStatus.csvDownloadUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(jobStatus.csvDownloadUrl, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              CSV
                            </Button>
                          )}
                          {jobStatus.jsonDownloadUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(jobStatus.jsonDownloadUrl, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              JSON
                            </Button>
                          )}
                          {jobStatus.quizletDownloadUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(jobStatus.quizletDownloadUrl, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Quizlet
                            </Button>
                          )}
                          {jobStatus.pdfDownloadUrl && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(jobStatus.pdfDownloadUrl, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Original PDF
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {jobStatus.status === 'failed' && (
                      <div className="space-y-4">
                        <p className="text-red-600 dark:text-red-400">
                          {jobStatus.errorMessage || 'An error occurred during processing.'}
                        </p>
                        <Button onClick={resetForm} variant="outline">
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Try Again
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