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
          <div className="space-y-4 sm:space-y-6">
            {jobs.map((job: HistoryJob) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center space-x-2 text-sm sm:text-base">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                        {editingJobId === job.id ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <Input
                              value={editingFilename}
                              onChange={(e) => setEditingFilename(e.target.value)}
                              className="text-sm sm:text-base"
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
                              className="text-green-600 hover:text-green-700 p-1"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancelRename}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 flex-1">
                            <span className="truncate">{job.filename}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartRename(job.id, job.filename)}
                              className="text-gray-500 hover:text-gray-700 p-1"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm">
                          <span className="flex items-center">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            {formatDate(job.createdAt)}
                          </span>
                          <span>{formatFileSize(job.fileSize)}</span>
                          <span className="capitalize">{job.subject}</span>
                          <span className="capitalize">{job.difficulty}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <Badge className={`${getStatusColor(job.status)} text-xs`}>
                        {getStatusIcon(job.status)}
                        <span className="ml-1 capitalize">{job.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    {/* Progress and stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Flashcards</span>
                        <p className="font-medium">{job.flashcardCount}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Provider</span>
                        <p className="font-medium capitalize">{job.apiProvider}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Progress</span>
                        <p className="font-medium">{job.progress}%</p>
                      </div>
                      {job.processingTime && (
                        <div>
                          <span className="text-gray-500">Processing Time</span>
                          <p className="font-medium">{job.processingTime}s</p>
                        </div>
                      )}
                    </div>

                    {/* Error message */}
                    {job.errorMessage && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-red-800 dark:text-red-200 text-sm">{job.errorMessage}</p>
                      </div>
                    )}

                    <Separator />

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      {job.hasFlashcards && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewFlashcards(job)}
                          className="flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Flashcards
                        </Button>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {job.hasAnkiDeck && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job.id, 'anki')}
                            className="flex items-center justify-center text-xs sm:text-sm"
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            Anki
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(job.id, 'pdf')}
                          className="flex items-center justify-center text-xs sm:text-sm"
                        >
                          <FileDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          PDF
                        </Button>

                        {job.hasFlashcards && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(job.id, 'csv')}
                              className="flex items-center justify-center text-xs sm:text-sm"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              CSV
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(job.id, 'json')}
                              className="flex items-center justify-center text-xs sm:text-sm"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              JSON
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(job.id, 'quizlet')}
                              className="flex items-center justify-center text-xs sm:text-sm"
                            >
                              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                              Quizlet
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Delete button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteJob(job.id, job.filename)}
                        className="flex items-center text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20 text-xs sm:text-sm mt-2 sm:mt-0"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        Delete
                      </Button>
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