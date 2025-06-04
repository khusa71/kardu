import { useState, useCallback } from 'react';
import { FlashcardPair } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, Save, X, Eye, EyeOff, ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface FlashcardEditorProps {
  flashcards: FlashcardPair[];
  onFlashcardsChange: (flashcards: FlashcardPair[]) => void;
  readonly?: boolean;
}

interface EditingCard {
  index: number;
  card: FlashcardPair;
}

export function FlashcardEditor({ flashcards, onFlashcardsChange, readonly = false }: FlashcardEditorProps) {
  const [editingCard, setEditingCard] = useState<EditingCard | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleEdit = useCallback((index: number) => {
    setEditingCard({ index, card: { ...flashcards[index] } });
  }, [flashcards]);

  const handleSave = useCallback(() => {
    if (!editingCard) return;
    
    const updatedFlashcards = [...flashcards];
    updatedFlashcards[editingCard.index] = editingCard.card;
    onFlashcardsChange(updatedFlashcards);
    setEditingCard(null);
  }, [editingCard, flashcards, onFlashcardsChange]);

  const handleDelete = useCallback((index: number) => {
    const updatedFlashcards = flashcards.filter((_, i) => i !== index);
    onFlashcardsChange(updatedFlashcards);
  }, [flashcards, onFlashcardsChange]);

  const moveCard = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    if (readonly) return;
    
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= flashcards.length) return;

    const items = Array.from(flashcards);
    const [reorderedItem] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, reorderedItem);

    onFlashcardsChange(items);
  }, [flashcards, onFlashcardsChange, readonly]);

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Markdown renderer
  const MarkdownRenderer = ({ content }: { content: string }) => (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown>
        {content}
      </ReactMarkdown>
    </div>
  );

  // Preview Mode Component
  if (previewMode) {
    const currentCard = flashcards[currentPreviewIndex];

    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setPreviewMode(false)}
              className="flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              Exit Preview
            </Button>
            <span className="text-sm text-gray-500">
              Card {currentPreviewIndex + 1} of {flashcards.length}
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
              disabled={currentPreviewIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPreviewIndex(Math.min(flashcards.length - 1, currentPreviewIndex + 1))}
              disabled={currentPreviewIndex === flashcards.length - 1}
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="min-h-[400px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{showAnswer ? 'Answer' : 'Question'}</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAnswer(!showAnswer)}
              >
                {showAnswer ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <MarkdownRenderer content={showAnswer ? currentCard.back : currentCard.front} />
              
              {currentCard.subject && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{currentCard.subject}</Badge>
                  {currentCard.difficulty && (
                    <Badge className={getDifficultyColor(currentCard.difficulty)}>
                      {currentCard.difficulty}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No flashcards available
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {readonly ? "This set doesn't contain any flashcards." : "Start adding flashcards to build your study set."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Flashcards ({flashcards.length})
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {readonly ? 'Review your flashcards' : 'Edit and organize your flashcards'}
          </p>
        </div>
        <Button
          onClick={() => setPreviewMode(true)}
          className="flex items-center"
        >
          <Eye className="w-4 h-4 mr-2" />
          Preview Mode
        </Button>
      </div>

      {/* Edit Dialog */}
      {editingCard && (
        <Dialog open={true} onOpenChange={() => setEditingCard(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Flashcard</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="front">Question (Front)</Label>
                <Textarea
                  id="front"
                  value={editingCard.card.front}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      card: { ...editingCard.card, front: e.target.value }
                    })
                  }
                  className="min-h-[100px]"
                  placeholder="Enter the question or prompt..."
                />
              </div>

              <div>
                <Label htmlFor="back">Answer (Back)</Label>
                <Textarea
                  id="back"
                  value={editingCard.card.back}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      card: { ...editingCard.card, back: e.target.value }
                    })
                  }
                  className="min-h-[100px]"
                  placeholder="Enter the answer or explanation..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={editingCard.card.subject || ''}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, subject: e.target.value }
                      })
                    }
                    placeholder="e.g., Mathematics"
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={editingCard.card.difficulty || ''}
                    onValueChange={(value) =>
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, difficulty: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setEditingCard(null)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Flashcard List */}
      <div className="space-y-4">
        {flashcards.map((card, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-gray-500">Card {index + 1}</span>
                    {card.subject && (
                      <Badge variant="secondary" className="text-xs">{card.subject}</Badge>
                    )}
                    {card.difficulty && (
                      <Badge className={`${getDifficultyColor(card.difficulty)} text-xs`}>
                        {card.difficulty}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {!readonly && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveCard(index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => moveCard(index, 'down')}
                      disabled={index === flashcards.length - 1}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(index)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Question</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <MarkdownRenderer content={card.front} />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Answer</h4>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <MarkdownRenderer content={card.back} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}