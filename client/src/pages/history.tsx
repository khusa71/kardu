import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  Trash2
} from "lucide-react";
import { FlashcardEditor } from "@/components/flashcard-editor";
import { StudyMode } from "@/components/study-mode";
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
  const { user, loading: authLoading } = useFirebaseAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'history' | 'view' | 'study'>('history');
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);
  const [currentFlashcards, setCurrentFlashcards] = useState<FlashcardPair[]>([]);

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
      const baseName = job?.filename.replace('.pdf', '') || `StudyCards_${jobId}`;
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
      const response = await apiRequest("GET", `/api/jobs/${job.id}`);
      const jobData = await response.json();
      
      if (jobData.flashcards) {
        const flashcards = JSON.parse(jobData.flashcards);
        setCurrentFlashcards(flashcards);
        setSelectedJob(job);
        setViewMode('view');
      } else {
        toast({
          title: "No flashcards available",
          description: "Flashcards are not ready for this upload.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to load flashcards",
        description: error.message,
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => setViewMode('history')}>
                  ← Back to History
                </Button>
                <h1 className="text-xl font-bold">View Flashcards: {selectedJob?.filename}</h1>
              </div>
              <Button onClick={() => setViewMode('study')} className="flex items-center">
                <BarChart3 className="w-4 h-4 mr-2" />
                Start Study Mode
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          <FlashcardEditor
            flashcards={currentFlashcards}
            onFlashcardsChange={setCurrentFlashcards}
            readonly={true}
          />
        </main>
      </div>
    );
  }

  // Study mode
  if (viewMode === 'study' && currentFlashcards.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="outline" onClick={() => setViewMode('view')}>
                  ← Back to View
                </Button>
                <h1 className="text-xl font-bold">Study Mode: {selectedJob?.filename}</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral dark:text-white">Upload History</h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                View and manage your past PDF uploads and generated flashcards
              </p>
            </div>
            <Badge variant="outline" className="flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              {jobs.length} uploads
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <Button onClick={() => window.location.href = "/"}>
              Upload PDF
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job: HistoryJob) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span className="truncate">{job.filename}</span>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(job.createdAt)}
                          </span>
                          <span>{formatFileSize(job.fileSize)}</span>
                          <span className="capitalize">{job.subject}</span>
                          <span className="capitalize">{job.difficulty}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(job.status)}>
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
                    <div className="flex flex-wrap gap-2">
                      {job.hasFlashcards && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewFlashcards(job)}
                          className="flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Flashcards
                        </Button>
                      )}

                      {job.hasAnkiDeck && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(job.id, 'anki')}
                          className="flex items-center"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Anki Deck
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(job.id, 'pdf')}
                        className="flex items-center"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Original PDF
                      </Button>

                      {job.hasFlashcards && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job.id, 'csv')}
                            className="flex items-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            CSV
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job.id, 'json')}
                            className="flex items-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            JSON
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(job.id, 'quizlet')}
                            className="flex items-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Quizlet
                          </Button>
                        </>
                      )}
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