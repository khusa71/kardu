import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, CheckCircle } from "lucide-react";

interface ResponsiveUploadZoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  disabled?: boolean;
}

export function ResponsiveUploadZone({ 
  selectedFile, 
  onFileSelect, 
  onFileRemove, 
  disabled = false 
}: ResponsiveUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert('File size must be less than 10MB');
          return;
        }
        onFileSelect(file);
      } else {
        alert('Please select a PDF file');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          alert('File size must be less than 10MB');
          return;
        }
        onFileSelect(file);
      } else {
        alert('Please select a PDF file');
      }
    }
  };

  const handleClick = () => {
    if (disabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onFileSelect(file);
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

        {/* File Preview */}
        {selectedFile && (
          <div className="mt-4 lg:mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onFileRemove();
                }}
                className="text-gray-400 hover:text-red-500 flex-shrink-0 ml-2"
              >
                ×
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}