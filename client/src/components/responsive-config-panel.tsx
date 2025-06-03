import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Settings, ChevronDown, Lightbulb, Info } from "lucide-react";
import { useState } from "react";

interface ResponsiveConfigPanelProps {
  apiProvider: "openai" | "anthropic";
  onApiProviderChange: (provider: "openai" | "anthropic") => void;
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
  disabled?: boolean;
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
  disabled = false
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
              <Label htmlFor="count" className="text-sm font-medium">Number of Cards</Label>
              <Input
                id="count"
                type="number"
                min="5"
                max="100"
                value={flashcardCount}
                onChange={(e) => onFlashcardCountChange(Number(e.target.value))}
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
              <Label className="text-sm font-medium">AI Provider</Label>
              <Select value={apiProvider} onValueChange={onApiProviderChange}>
                <SelectTrigger className="h-10 lg:h-11 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="openai">OpenAI (GPT)</SelectItem>
                </SelectContent>
              </Select>
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
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}