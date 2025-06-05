import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Settings, ChevronDown, Lightbulb, Info, Crown, Zap, LoaderPinwheel, Check } from "lucide-react";
import { useState } from "react";

interface ResponsiveConfigPanelProps {
  apiProvider: "basic" | "advanced";
  onApiProviderChange: (provider: "basic" | "advanced") => void;
  flashcardCount: number;
  onFlashcardCountChange: (count: number) => void;
  subject: string;
  onSubjectChange: (subject: string) => void;
  focusAreas: {
    concepts: boolean;
    definitions: boolean;
    examples: boolean;
    procedures: boolean;
  };
  onFocusAreasChange: (areas: any) => void;
  difficulty: "beginner" | "intermediate" | "advanced";
  onDifficultyChange: (difficulty: "beginner" | "intermediate" | "advanced") => void;
  customContext: string;
  onCustomContextChange: (context: string) => void;
  customFileName?: string;
  onCustomFileNameChange?: (name: string) => void;
  customFlashcardSetName?: string;
  onCustomFlashcardSetNameChange?: (name: string) => void;
  disabled?: boolean;
  onGenerate: () => void;
  isGenerateDisabled: boolean;
  isPending: boolean;
  canUpload: boolean;
  user: any;
  isEmailVerified: boolean;
  userUploads: number;
  userLimit: number;
  isPremium: boolean;
  onAuthModalOpen: () => void;
  onSendVerificationEmail: () => Promise<void>;
}

export function ResponsiveConfigPanel({
  apiProvider,
  onApiProviderChange,
  flashcardCount,
  onFlashcardCountChange,
  subject,
  onSubjectChange,
  focusAreas,
  onFocusAreasChange,
  difficulty,
  onDifficultyChange,
  customContext,
  onCustomContextChange,
  customFileName,
  onCustomFileNameChange,
  customFlashcardSetName,
  onCustomFlashcardSetNameChange,
  disabled = false,
  onGenerate,
  isGenerateDisabled,
  isPending,
  canUpload,
  user,
  isEmailVerified,
  userUploads,
  userLimit,
  isPremium,
  onAuthModalOpen,
  onSendVerificationEmail
}: ResponsiveConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const subjects = [
    { value: "programming", label: "Programming & Computer Science" },
    { value: "mathematics", label: "Mathematics" },
    { value: "science", label: "Science" },
    { value: "history", label: "History" },
    { value: "literature", label: "Literature" },
    { value: "language", label: "Language Learning" },
    { value: "business", label: "Business & Economics" },
    { value: "medicine", label: "Medicine & Health" },
    { value: "law", label: "Law" },
    { value: "general", label: "General Studies" },
  ];

  return (
    <Card className={`${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <CardContent className="p-4 lg:p-8">
        <div className="flex items-center mb-4 lg:mb-6">
          <div className="bg-primary text-white rounded-lg p-2 mr-3">
            <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
          </div>
          <h2 className="text-lg lg:text-xl font-semibold text-neutral dark:text-white">
            Configuration
          </h2>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">Subject Area</Label>
              <Select value={subject} onValueChange={onSubjectChange}>
                <SelectTrigger className="h-10 lg:h-11 text-sm">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subj) => (
                    <SelectItem key={subj.value} value={subj.value}>
                      {subj.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="count" className="text-sm font-medium">Number of Cards (1-100)</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={flashcardCount}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 1 && value <= 100) {
                    onFlashcardCountChange(value);
                  }
                }}
                className="h-10 lg:h-11 text-sm"
                placeholder="Enter 1-100"
              />
            </div>
          </div>

          {/* Custom File Names */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-2">
              <Label htmlFor="customFileName" className="text-sm font-medium">File Name (Optional)</Label>
              <Input
                id="customFileName"
                placeholder="Enter custom file name..."
                value={customFileName || ""}
                onChange={(e) => onCustomFileNameChange?.(e.target.value)}
                className="h-10 lg:h-11 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customFlashcardSetName" className="text-sm font-medium">Flashcard Set Name (Optional)</Label>
              <Input
                id="customFlashcardSetName"
                placeholder="Enter flashcard set name..."
                value={customFlashcardSetName || ""}
                onChange={(e) => onCustomFlashcardSetNameChange?.(e.target.value)}
                className="h-10 lg:h-11 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Difficulty Level</Label>
              <Select value={difficulty} onValueChange={onDifficultyChange}>
                <SelectTrigger className="h-10 lg:h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                AI Quality Level
                <Info className="w-3 h-3 text-gray-400" />
              </Label>
              <TooltipProvider>
                <Select value={apiProvider} onValueChange={onApiProviderChange}>
                  <SelectTrigger className="h-10 lg:h-11 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic" className="flex items-center">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-500" />
                        <span>Basic (Fast & Cost-Efficient)</span>
                      </div>
                    </SelectItem>
                    
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SelectItem 
                          value="advanced" 
                          disabled={!isPremium}
                          className={`flex items-center ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-purple-500" />
                            <span>Advanced (High Accuracy)</span>
                            {!isPremium && <span className="text-xs text-gray-400 ml-2">Premium Only</span>}
                          </div>
                        </SelectItem>
                      </TooltipTrigger>
                      {!isPremium && (
                        <TooltipContent>
                          <p>Upgrade to Premium to unlock higher-quality AI generation</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </SelectContent>
                </Select>
              </TooltipProvider>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between p-3 h-auto text-left"
            >
              <div className="flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Advanced Options</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>
            
            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center">
                    <Info className="w-3 h-3 mr-1" />
                    Focus Areas
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="concepts" 
                        checked={focusAreas.concepts}
                        onCheckedChange={(checked) => 
                          onFocusAreasChange({...focusAreas, concepts: checked})
                        }
                      />
                      <Label htmlFor="concepts" className="text-sm cursor-pointer">
                        Core Concepts
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="definitions" 
                        checked={focusAreas.definitions}
                        onCheckedChange={(checked) => 
                          onFocusAreasChange({...focusAreas, definitions: checked})
                        }
                      />
                      <Label htmlFor="definitions" className="text-sm cursor-pointer">
                        Definitions
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="examples" 
                        checked={focusAreas.examples}
                        onCheckedChange={(checked) => 
                          onFocusAreasChange({...focusAreas, examples: checked})
                        }
                      />
                      <Label htmlFor="examples" className="text-sm cursor-pointer">
                        Examples
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="procedures" 
                        checked={focusAreas.procedures}
                        onCheckedChange={(checked) => 
                          onFocusAreasChange({...focusAreas, procedures: checked})
                        }
                      />
                      <Label htmlFor="procedures" className="text-sm cursor-pointer">
                        Procedures
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Custom Context Section */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Label className="text-sm font-medium flex items-center">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    Custom Context (Optional)
                  </Label>
                  <Textarea
                    placeholder="Provide specific instructions or themes for flashcard generation..."
                    value={customContext}
                    onChange={(e) => onCustomContextChange(e.target.value)}
                    disabled={disabled}
                    rows={3}
                    className="text-sm resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Provide specific instructions or themes for flashcard generation. This will override the default subject-based prompts.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="text-center">
              <Button 
                onClick={onGenerate}
                disabled={isGenerateDisabled}
                size="lg"
                className="w-full sm:w-auto px-8 py-3 text-lg font-semibold"
              >
                {isPending ? (
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}