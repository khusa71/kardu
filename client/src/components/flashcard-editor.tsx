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
import { Edit, Trash2, GripVertical, Save, X, Eye, EyeOff } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

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

  const handleDragEnd = useCallback((result: any) => {
    if (!result.destination || readonly) return;

    const items = Array.from(flashcards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

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

  // Preview Mode Component
  if (previewMode) {
    const currentCard = flashcards[currentPreviewIndex];

    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
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
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPreviewIndex(Math.min(flashcards.length - 1, currentPreviewIndex + 1))}
              disabled={currentPreviewIndex === flashcards.length - 1}
            >
              Next
            </Button>
          </div>
        </div>

        <Card className="min-h-96">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2">
              {currentCard.topic && (
                <Badge variant="secondary">{currentCard.topic}</Badge>
              )}
              {currentCard.difficulty && (
                <Badge className={getDifficultyColor(currentCard.difficulty)}>
                  {currentCard.difficulty}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Question:</h3>
              <p className="text-base leading-relaxed">{currentCard.question}</p>
            </div>
            
            {showAnswer ? (
              <div className="space-y-4 border-t pt-6">
                <h3 className="text-lg font-semibold text-green-600">Answer:</h3>
                <div className="text-base leading-relaxed whitespace-pre-wrap">
                  {currentCard.answer}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowAnswer(false)}
                  className="flex items-center"
                >
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Answer
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowAnswer(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                Show Answer
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold">Flashcards ({flashcards.length})</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(true)}
            className="flex items-center"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview Mode
          </Button>
        </div>
        {!readonly && (
          <p className="text-sm text-gray-500">
            Drag cards to reorder, click edit to modify content
          </p>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="flashcards">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {flashcards.map((card, index) => (
                <Draggable
                  key={`card-${index}`}
                  draggableId={`card-${index}`}
                  index={index}
                  isDragDisabled={readonly}
                >
                  {(provided) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {!readonly && (
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                              </div>
                            )}
                            <span className="text-sm font-medium text-gray-500">
                              Card {index + 1}
                            </span>
                            {card.topic && (
                              <Badge variant="secondary" className="text-xs">
                                {card.topic}
                              </Badge>
                            )}
                            {card.difficulty && (
                              <Badge className={`text-xs ${getDifficultyColor(card.difficulty)}`}>
                                {card.difficulty}
                              </Badge>
                            )}
                          </div>
                          {!readonly && (
                            <div className="flex space-x-2">
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
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Question:
                          </Label>
                          <p className="text-sm mt-1 leading-relaxed">{card.question}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Answer:
                          </Label>
                          <p className="text-sm mt-1 leading-relaxed whitespace-pre-wrap">
                            {card.answer}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Edit Dialog */}
      <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Flashcard</DialogTitle>
          </DialogHeader>
          {editingCard && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  value={editingCard.card.question}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      card: { ...editingCard.card, question: e.target.value }
                    })
                  }
                  className="mt-1"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  value={editingCard.card.answer}
                  onChange={(e) =>
                    setEditingCard({
                      ...editingCard,
                      card: { ...editingCard.card, answer: e.target.value }
                    })
                  }
                  className="mt-1"
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    value={editingCard.card.topic || ''}
                    onChange={(e) =>
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, topic: e.target.value }
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={editingCard.card.difficulty || 'intermediate'}
                    onValueChange={(value) =>
                      setEditingCard({
                        ...editingCard,
                        card: { ...editingCard.card, difficulty: value as any }
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
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
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex items-center">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}