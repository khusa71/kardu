import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Calendar, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FlashcardJob } from "@shared/schema";

interface MyFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (job: FlashcardJob) => void;
}

export function MyFilesModal({ isOpen, onClose, onFileSelect }: MyFilesModalProps) {
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  const [selectedJob, setSelectedJob] = useState<FlashcardJob | null>(null);

  const { data: userJobs = [], isLoading } = useQuery<FlashcardJob[]>({
    queryKey: ["/api/history"],
    enabled: isOpen,
  });

  const regenerateMutation = useMutation({
    mutationFn: async (jobId: number) => {
      return apiRequest("POST", `/api/regenerate/${jobId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Flashcard regeneration started successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to regenerate flashcards",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (job: FlashcardJob) => {
    setSelectedJob(job);
  };

  const handleConfirmSelection = () => {
    if (selectedJob) {
      onFileSelect(selectedJob);
      onClose();
    }
  };

  const handleRegenerate = (jobId: number) => {
    regenerateMutation.mutate(jobId);
  };

  const handleDownload = async (job: FlashcardJob) => {
    try {
      if (job.pdfDownloadUrl) {
        const response = await fetch(`/api/download/pdf/${job.id}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = job.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          throw new Error('Download failed');
        }
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Unknown date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || statusColors.pending}>
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>My Files</DialogTitle>
          <DialogDescription>
            Select a previously uploaded PDF to regenerate flashcards or view existing ones.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2">Loading your files...</span>
            </div>
          ) : userJobs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
                No files found
              </h3>
              <p className="text-gray-500 dark:text-gray-500">
                Upload your first PDF to get started with flashcard generation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {userJobs.map((job: FlashcardJob) => (
                <Card 
                  key={job.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedJob?.id === job.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleFileSelect(job)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {job.filename}
                          </h3>
                          {getStatusBadge(job.status)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(job.createdAt)}
                          </div>
                          {job.flashcardCount && (
                            <div>{job.flashcardCount} cards generated</div>
                          )}
                          {job.subject && (
                            <div className="capitalize">{job.subject}</div>
                          )}
                        </div>

                        {job.errorMessage && (
                          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                            Error: {job.errorMessage}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {job.status === 'completed' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  if (!user?.getIdToken) {
                                    throw new Error('Authentication required');
                                  }
                                  const token = await user.getIdToken();
                                  const link = document.createElement('a');
                                  link.href = `/api/download/pdf/${job.id}`;
                                  link.setAttribute('download', job.filename);
                                  if (token) {
                                    // For authenticated downloads, we need to handle this differently
                                    const response = await fetch(`/api/download/pdf/${job.id}`, {
                                      headers: {
                                        'Authorization': `Bearer ${token}`
                                      }
                                    });
                                    if (response.ok) {
                                      const blob = await response.blob();
                                      const url = window.URL.createObjectURL(blob);
                                      link.href = url;
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                      window.URL.revokeObjectURL(url);
                                    } else {
                                      throw new Error('Download failed');
                                    }
                                  }
                                } catch (error) {
                                  toast({
                                    title: "Download failed",
                                    description: "Unable to download the PDF file",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerate(job.id);
                              }}
                              disabled={regenerateMutation.isPending}
                            >
                              {regenerateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
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
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedJob ? `Selected: ${selectedJob.filename}` : 'Select a file to proceed'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {selectedJob && (
              <Button onClick={handleConfirmSelection} disabled={!selectedJob}>
                Select File
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}