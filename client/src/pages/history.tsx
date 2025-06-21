import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  FileText, 
  Download, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Calendar,
  BarChart3,
  FileDown,
  Eye,
  Trash2,
  Edit2,
  Check,
  X
} from "lucide-react";
import { FlashcardEditor } from "@/components/flashcard-editor";
import { StudyMode } from "@/components/study-mode";
import { NavigationBar } from "@/components/navigation-bar";
import type { FlashcardPair } from "@shared/schema";

interface HistoryJob {
  id: number;
  filename: string;
  fileSize: number;
  subject: string;
  difficulty: string;
  status: string;
  progress: number;
  flashcardCount: number;
  apiProvider: string;
  createdAt: string;
  updatedAt: string;
  processingTime: number;
  hasFlashcards: boolean;
  hasAnkiDeck: boolean;
  hasCsvExport: boolean;
  hasJsonExport: boolean;
  hasQuizletExport: boolean;
  errorMessage?: string;
}

export default function History() {
  const { user, loading: authLoading } = useSupabaseAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<'history' | 'view' | 'study'>('history');
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);
  const [currentFlashcards, setCurrentFlashcards] = useState<FlashcardPair[]>([]);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingFilename, setEditingFilename] = useState<string>('');

  // Fetch user's upload history
  const { data: jobs = [], isLoading, error } = useQuery<HistoryJob[]>({
    queryKey: ["/api/history"],
    enabled: !!user && !authLoading,
  });

  const handleDownload = async (jobId: number, format: 'anki' | 'csv' | 'json' | 'quizlet' | 'pdf') => {
    try {
      let url: string;
      if (format === 'anki') {
        url = `/api/download/${jobId}`;
      } else if (format === 'pdf') {
        url = `/api/download/pdf/${jobId}`;
      } else {
        url = `/api/export/${jobId}/${format}`;
      }

      const response = await apiRequest("GET", url);
      const blob = await response.blob();
      
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Set filename based on format
      const job = jobs.find((j) => j.id === jobId);
      const baseName = job?.filename.replace('.pdf', '') || `Kardu_${jobId}`;
      const extensions = { anki: '.apkg', csv: '.csv', json: '.json', quizlet: '.txt', pdf: '.pdf' };
      link.download = `${baseName}${extensions[format]}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Download started",
        description: `Your ${format.toUpperCase()} file is downloading.`,
      });
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleViewFlashcards = async (job: HistoryJob) => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
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
        
        setCurrentFlashcards(normalizedFlashcards);
        setSelectedJob(job);
        setViewMode('view');
      } else if (jobData.status === 'completed' && !jobData.flashcards) {
        // Fallback: offer to regenerate if flashcards are missing but job is completed
        const shouldRegenerate = confirm("Flashcards appear to be missing for this completed job. Would you like to regenerate them?");
        if (shouldRegenerate) {
          try {
            const response = await fetch(`/api/regenerate/${job.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({}),
            });
            
            if (response.ok) {
              toast({
                title: "Regeneration Started",
                description: "Flashcards are being regenerated. Please check back in a few minutes.",
              });
            } else {
              throw new Error('Failed to start regeneration');
            }
          } catch (error) {
            toast({
              title: "Regeneration Failed",
              description: "Unable to regenerate flashcards. Please try again later.",
              variant: "destructive",
            });
          }
        }
      } else {
        toast({
          title: "No flashcards available",
          description: jobData.status === 'processing' 
            ? "Flashcards are still being generated. Please wait and try again."
            : "Flashcards are not ready for this upload.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error loading flashcards:', error);
      toast({
        title: "Failed to load flashcards",
        description: error.message || "Unable to load flashcards. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStartRename = (jobId: number, currentFilename: string) => {
    setEditingJobId(jobId);
    setEditingFilename(currentFilename);
  };

  const handleCancelRename = () => {
    setEditingJobId(null);
    setEditingFilename('');
  };

  const handleSaveRename = async (jobId: number) => {
    if (!editingFilename.trim()) {
      toast({
        title: "Invalid filename",
        description: "Filename cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("PUT", `/api/jobs/${jobId}/rename`, {
        filename: editingFilename.trim()
      });

      if (response.ok) {
        toast({
          title: "Filename updated",
          description: "The filename has been successfully updated.",
        });
        
        // Refresh the history data
        queryClient.invalidateQueries({ queryKey: ["/api/history"] });
        handleCancelRename();
      } else {
        throw new Error('Failed to update filename');
      }
    } catch (error) {
      toast({
        title: "Failed to update filename",
        description: "Unable to update the filename. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteJob = async (jobId: number, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await apiRequest("DELETE", `/api/jobs/${jobId}`);
      const result = await response.json();
      
      toast({
        title: "Job deleted successfully",
        description: `Deleted ${result.deletedFiles} of ${result.totalFiles} associated files.`,
      });
      
      // Refresh the jobs list
      window.location.reload();
      
    } catch (error: any) {
      toast({
        title: "Failed to delete job",
        description: error.message || "An error occurred while deleting the job.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
      case 'pending':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'processing':
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
          <p className="text-gray-600">Please sign in to view your upload history.</p>
        </div>
      </div>
    );
  }

  // Flashcard viewing mode
  if (viewMode === 'view' && currentFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        
        <main className="max-w-screen-xl mx-auto px-4 pt-4 pb-16">
          <div className="mb-6 space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                <Button variant="outline" onClick={() => setViewMode('history')} size="sm">
                  ← Back to History
                </Button>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {selectedJob?.filename}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {currentFlashcards.length} cards
                    </Badge>
                    {selectedJob?.subject && (
                      <Badge variant="outline" className="text-xs">
                        {selectedJob.subject}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button 
                  onClick={() => setLocation(`/study/${selectedJob?.id}`)} 
                  className="flex items-center flex-1 sm:flex-none" 
                  size="sm"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Start Study Mode
                </Button>
              </div>
            </div>
          </div>
          <FlashcardEditor
            flashcards={currentFlashcards}
            onFlashcardsChange={setCurrentFlashcards}
            readonly={false}
            jobId={selectedJob?.id}
            onSave={async (flashcards) => {
              try {
                const response = await fetch(`/api/jobs/${selectedJob?.id}/flashcards`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ flashcards: JSON.stringify(flashcards) }),
                });
                
                if (!response.ok) {
                  throw new Error('Failed to save flashcards');
                }
                
                toast({
                  title: "Success",
                  description: "Flashcards saved successfully",
                });
              } catch (error: any) {
                toast({
                  title: "Error",
                  description: error.message || "Failed to save flashcards",
                  variant: "destructive",
                });
                throw error;
              }
            }}
          />
        </main>
      </div>
    );
  }

  // Study mode
  if (viewMode === 'study' && currentFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationBar />
        
        <main className="max-w-screen-xl mx-auto px-4 pt-4 pb-16">
          <div className="mb-6 space-y-2">
            <Button variant="outline" onClick={() => setViewMode('view')} size="sm">
              ← Back to View
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Study Mode: {selectedJob?.filename}
            </h1>
          </div>
          
          <StudyMode
            flashcards={currentFlashcards}
            onComplete={(results) => {
              toast({
                title: "Study session complete!",
                description: `Accuracy: ${Math.round(results.accuracy)}% • Time: ${Math.round(results.timeSpent)} min`,
              });
              setViewMode('view');
            }}
            onExit={() => setViewMode('view')}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationBar />
      
      <main className="max-w-screen-xl mx-auto px-4 pt-4 pb-16">
        {/* Page Header */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Upload History</h1>
              <p className="text-muted-foreground text-sm md:text-base">
                View and manage your past PDF uploads and generated flashcards
              </p>
            </div>
            <Badge variant="outline" className="flex items-center text-xs sm:text-sm">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{jobs.length} uploads</span>
              <span className="sm:hidden">{jobs.length}</span>
            </Badge>
          </div>
        </div>
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">Failed to load upload history. Please try again.</p>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No uploads yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Upload your first PDF to start generating flashcards
            </p>
            <Button onClick={() => setLocation("/upload")}>
              Upload PDF
            </Button>
          </div>
        ) : (
          <div className="grid gap-6">
            {jobs.map((job: HistoryJob) => (
              <Card key={job.id} className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:scale-[1.02]">
                <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      {/* Enhanced File Header */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <FileText className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="flex items-center space-x-2 text-lg font-bold">
                            {editingJobId === job.id ? (
                              <div className="flex items-center space-x-2 flex-1">
                                <Input
                                  value={editingFilename}
                                  onChange={(e) => setEditingFilename(e.target.value)}
                                  className="text-lg font-semibold bg-white dark:bg-gray-800 border-2 border-blue-300"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveRename(job.id);
                                    } else if (e.key === 'Escape') {
                                      handleCancelRename();
                                    }
                                  }}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleSaveRename(job.id)}
                                  className="text-green-600 hover:text-green-700 hover:bg-green-100 p-2"
                                >
                                  <Check className="w-5 h-5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={handleCancelRename}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-100 p-2"
                                >
                                  <X className="w-5 h-5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-3 flex-1">
                                <span className="truncate text-gray-900 dark:text-gray-100">{job.filename}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartRename(job.id, job.filename)}
                                  className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700 hover:bg-blue-100 p-1 transition-all duration-200"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </CardTitle>
                          
                          {/* Enhanced Metadata */}
                          <div className="mt-3 flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(job.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                              <FileText className="w-4 h-4" />
                              <span>{formatFileSize(job.fileSize)}</span>
                            </div>
                            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                              {job.subject}
                            </Badge>
                            <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                              {job.difficulty}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Enhanced Status */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Badge className={`${getStatusColor(job.status)} text-sm px-3 py-1 shadow-md`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-2 capitalize font-semibold">{job.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-6">
                    {/* Enhanced Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                            <FileText className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Flashcards</span>
                            <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{job.flashcardCount}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">AI Model</span>
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-100 capitalize">{job.apiProvider}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                          <div>
                            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">Progress</span>
                            <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{job.progress}%</p>
                          </div>
                        </div>
                      </div>
                      
                      {job.processingTime && (
                        <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                              <Clock className="w-3 h-3 text-white" />
                            </div>
                            <div>
                              <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Time</span>
                              <p className="text-sm font-bold text-purple-900 dark:text-purple-100">{job.processingTime}s</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Error message */}
                    {job.errorMessage && (
                      <div className="p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-red-900 dark:text-red-100">Processing Error</h4>
                            <p className="text-red-800 dark:text-red-200 text-sm">{job.errorMessage}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Separator className="bg-gradient-to-r from-transparent via-gray-300 to-transparent" />

                    {/* Enhanced Action Buttons */}
                    <div className="space-y-4">
                      {/* Primary Actions */}
                      {job.hasFlashcards && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => handleViewFlashcards(job)}
                            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <Eye className="w-5 h-5 mr-2" />
                            View & Edit Flashcards
                          </Button>
                          <Button
                            onClick={() => setLocation(`/study/${job.id}`)}
                            className="flex-1 h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300"
                          >
                            <BarChart3 className="w-5 h-5 mr-2" />
                            Start Study Mode
                          </Button>
                        </div>
                      )}

                      {/* Enhanced Download Actions */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Download className="w-4 h-4" />
                          Download Options
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {job.hasAnkiDeck && (
                            <Button
                              variant="outline"
                              onClick={() => handleDownload(job.id, 'anki')}
                              className="h-10 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800 hover:from-orange-100 hover:to-red-100 transition-all duration-300"
                            >
                              <Download className="w-4 h-4 mr-2 text-orange-600" />
                              <span className="font-medium text-orange-800 dark:text-orange-200">Anki</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            onClick={() => handleDownload(job.id, 'pdf')}
                            className="h-10 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800 hover:from-red-100 hover:to-pink-100 transition-all duration-300"
                          >
                            <FileDown className="w-4 h-4 mr-2 text-red-600" />
                            <span className="font-medium text-red-800 dark:text-red-200">PDF</span>
                          </Button>

                          {job.hasFlashcards && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleDownload(job.id, 'csv')}
                                className="h-10 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 transition-all duration-300"
                              >
                                <Download className="w-4 h-4 mr-2 text-green-600" />
                                <span className="font-medium text-green-800 dark:text-green-200">CSV</span>
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => handleDownload(job.id, 'json')}
                                className="h-10 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800 hover:from-blue-100 hover:to-cyan-100 transition-all duration-300"
                              >
                                <Download className="w-4 h-4 mr-2 text-blue-600" />
                                <span className="font-medium text-blue-800 dark:text-blue-200">JSON</span>
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => handleDownload(job.id, 'quizlet')}
                                className="h-10 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-violet-100 transition-all duration-300"
                              >
                                <Download className="w-4 h-4 mr-2 text-purple-600" />
                                <span className="font-medium text-purple-800 dark:text-purple-200">Quizlet</span>
                              </Button>
                            </>
                          )}
                        </div>
                        
                        {/* Enhanced Delete Action */}
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteJob(job.id, job.filename)}
                            className="w-full h-10 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800 hover:from-red-100 hover:to-rose-100 transition-all duration-300"
                          >
                            <Trash2 className="w-4 h-4 mr-2 text-red-600" />
                            <span className="font-medium text-red-800 dark:text-red-200">Delete Job & Files</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}