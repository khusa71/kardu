import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle, FolderOpen } from "lucide-react";
import { MyFilesModal } from "./my-files-modal";

interface ResponsiveUploadZoneProps {
  selectedFiles: File[];
  onFilesSelect: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onFileReuse?: (file: any) => void;
  disabled?: boolean;
  isPremium?: boolean;
  maxFiles?: number;
}

export function ResponsiveUploadZone({ 
  selectedFiles, 
  onFilesSelect, 
  onFileRemove, 
  onFileReuse,
  disabled = false,
  isPremium = false,
  maxFiles = 1
}: ResponsiveUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMyFiles, setShowMyFiles] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelection(droppedFiles);
  };
  
  const handleFileSelection = (newFiles: File[]) => {
    // Filter PDF files only
    const pdfFiles = newFiles.filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length === 0) {
      alert('Please select PDF files only');
      return;
    }
    
    // Check file size limit (10MB per file)
    const oversizedFiles = pdfFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      alert(`These files exceed 10MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }
    
    // Check file count limits based on user type
    const totalFiles = selectedFiles.length + pdfFiles.length;
    if (totalFiles > maxFiles) {
      const userType = isPremium ? 'Premium' : 'Free';
      alert(`${userType} users can upload up to ${maxFiles} file${maxFiles > 1 ? 's' : ''} at once. ${isPremium ? '' : 'Upgrade to Pro for bulk uploads.'}`);
      return;
    }
    
    // Add new files to existing selection
    onFilesSelect([...selectedFiles, ...pdfFiles]);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileSelection(files);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.multiple = maxFiles > 1;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) handleFileSelection(files);
    };
    input.click();
  };

  return (
    <Card className="animate-fade-in">
      <CardContent className="p-4 lg:p-8">
        <div className="flex items-center mb-4 lg:mb-6">
          <div className="bg-primary text-white rounded-lg p-2 mr-3">
            <FileText className="w-4 h-4 lg:w-5 lg:h-5" />
          </div>
          <h2 className="text-lg lg:text-xl font-semibold text-neutral dark:text-white">
            Upload Your Educational PDF
          </h2>
        </div>
        
        <div 
          className={`upload-zone border-2 border-dashed rounded-xl p-6 lg:p-8 text-center cursor-pointer transition-all touch-manipulation ${
            isDragOver 
              ? 'dragover border-primary bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 dark:border-gray-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDrop={handleDrop}
          onDragOver={(e) => { 
            e.preventDefault(); 
            if (!disabled) setIsDragOver(true); 
          }}
          onDragLeave={() => setIsDragOver(false)}
          onClick={handleClick}
        >
          <div className="space-y-3 lg:space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6 lg:w-8 lg:h-8 text-primary" />
            </div>
            <div>
              <p className="text-base lg:text-lg font-medium text-neutral dark:text-white mb-2">
                Drop your PDF here, or tap to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports PDF files up to 10MB
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs text-gray-400">
              <span className="flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                Academic textbooks
              </span>
              <span className="flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                Course materials
              </span>
              <span className="flex items-center">
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                Study guides
              </span>
            </div>
          </div>
        </div>

        {/* File Preview - Multiple Files */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 lg:mt-6 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-neutral dark:text-white">
                Selected Files ({selectedFiles.length}/{maxFiles})
              </span>
              {!isPremium && selectedFiles.length >= 1 && (
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Upgrade to Pro for bulk uploads
                </span>
              )}
            </div>
            {selectedFiles.map((file, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-neutral dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove(index);
                    }}
                    className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}