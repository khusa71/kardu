import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Calendar, HardDrive, Download, RotateCcw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface FileItem {
  id: number;
  filename: string;
  fileSize: number;
  subject: string;
  difficulty: string;
  createdAt: string;
  hasFlashcards: boolean;
  pdfStorageKey?: string;
}

interface MyFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: FileItem) => void;
}

export function MyFilesModal({ isOpen, onClose, onFileSelect }: MyFilesModalProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['/api/history'],
    enabled: isOpen,
    select: (data: any[]) => data.filter(job => job.pdfStorageKey && job.status === 'completed')
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: FileItem) => {
    setSelectedFile(file);
  };

  const handleUseFile = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
      onClose();
      setSelectedFile(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>My Files</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No files found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Upload your first PDF to see it here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* File List */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Available Files ({files.length})
                </h3>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {files.map((file: FileItem) => (
                      <Card
                        key={file.id}
                        className={`cursor-pointer transition-colors ${
                          selectedFile?.id === file.id
                            ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleFileSelect(file)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate text-gray-900 dark:text-white">
                                {file.filename}
                              </h4>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {file.subject}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {file.difficulty}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <HardDrive className="w-3 h-3" />
                                  <span>{formatFileSize(file.fileSize)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</span>
                                </div>
                              </div>
                            </div>
                            {file.hasFlashcards && (
                              <Badge variant="default" className="text-xs ml-2">
                                Ready
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* File Details */}
              <div className="border-l pl-6">
                {selectedFile ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        File Details
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Filename
                          </label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                            {selectedFile.filename}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Subject
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedFile.subject}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Difficulty
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedFile.difficulty}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              File Size
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatFileSize(selectedFile.fileSize)}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Uploaded
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {formatDistanceToNow(new Date(selectedFile.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button
                        onClick={handleUseFile}
                        className="w-full"
                        disabled={!selectedFile.hasFlashcards}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Regenerate Flashcards
                      </Button>
                      {selectedFile.pdfStorageKey && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const downloadUrl = `/api/download/pdf/${selectedFile.id}`;
                            window.open(downloadUrl, '_blank');
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Original PDF
                        </Button>
                      )}
                    </div>

                    {!selectedFile.hasFlashcards && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-700 dark:text-yellow-400">
                          This file doesn't have flashcards yet or processing failed. 
                          You can still download the original PDF.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Select a file to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}