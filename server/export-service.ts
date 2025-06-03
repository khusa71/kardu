import { FlashcardPair } from '../shared/schema';
import { writeFile } from 'fs/promises';
import path from 'path';

export interface ExportOptions {
  format: 'anki' | 'csv' | 'json' | 'quizlet';
  filename?: string;
}

export class ExportService {
  // Export flashcards to CSV format
  async exportToCSV(flashcards: FlashcardPair[], outputPath: string): Promise<string> {
    const csvContent = [
      'Question,Answer,Topic,Difficulty',
      ...flashcards.map(card => 
        `"${this.escapeCsv(card.question)}","${this.escapeCsv(card.answer)}","${card.topic || ''}","${card.difficulty || ''}"`
      )
    ].join('\n');

    const filePath = path.join(outputPath, 'flashcards.csv');
    await writeFile(filePath, csvContent, 'utf-8');
    return filePath;
  }

  // Export flashcards to JSON format
  async exportToJSON(flashcards: FlashcardPair[], outputPath: string): Promise<string> {
    const jsonData = {
      metadata: {
        exportDate: new Date().toISOString(),
        cardCount: flashcards.length,
        format: 'StudyCards AI Export'
      },
      flashcards: flashcards.map(card => ({
        question: card.question,
        answer: card.answer,
        topic: card.topic || '',
        difficulty: card.difficulty || 'intermediate',
        tags: card.topic ? [card.topic] : []
      }))
    };

    const filePath = path.join(outputPath, 'flashcards.json');
    await writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
    return filePath;
  }

  // Export flashcards in Quizlet-compatible format
  async exportToQuizlet(flashcards: FlashcardPair[], outputPath: string): Promise<string> {
    // Quizlet import format: term[tab]definition[newline]
    const quizletContent = flashcards.map(card => 
      `${this.cleanForQuizlet(card.question)}\t${this.cleanForQuizlet(card.answer)}`
    ).join('\n');

    const filePath = path.join(outputPath, 'flashcards_quizlet.txt');
    await writeFile(filePath, quizletContent, 'utf-8');
    return filePath;
  }

  // Export to multiple formats simultaneously
  async exportMultipleFormats(
    flashcards: FlashcardPair[], 
    outputDir: string, 
    formats: string[]
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const format of formats) {
      switch (format) {
        case 'csv':
          results.csv = await this.exportToCSV(flashcards, outputDir);
          break;
        case 'json':
          results.json = await this.exportToJSON(flashcards, outputDir);
          break;
        case 'quizlet':
          results.quizlet = await this.exportToQuizlet(flashcards, outputDir);
          break;
        case 'anki':
          // Anki export handled by existing anki-generator.py
          results.anki = path.join(outputDir, 'flashcards.apkg');
          break;
      }
    }

    return results;
  }

  // Generate study statistics
  generateStudyStats(flashcards: FlashcardPair[]): any {
    const topics = new Map<string, number>();
    const difficulties = new Map<string, number>();

    flashcards.forEach(card => {
      // Count topics
      const topic = card.topic || 'General';
      topics.set(topic, (topics.get(topic) || 0) + 1);

      // Count difficulties
      const difficulty = card.difficulty || 'intermediate';
      difficulties.set(difficulty, (difficulties.get(difficulty) || 0) + 1);
    });

    return {
      totalCards: flashcards.length,
      topicDistribution: Object.fromEntries(topics),
      difficultyDistribution: Object.fromEntries(difficulties),
      averageQuestionLength: flashcards.reduce((sum, card) => sum + card.question.length, 0) / flashcards.length,
      averageAnswerLength: flashcards.reduce((sum, card) => sum + card.answer.length, 0) / flashcards.length
    };
  }

  private escapeCsv(text: string): string {
    return text.replace(/"/g, '""').replace(/\n/g, ' ').replace(/\r/g, '');
  }

  private cleanForQuizlet(text: string): string {
    // Remove tabs and clean up formatting for Quizlet
    return text.replace(/\t/g, ' ').replace(/\n/g, ' ').trim();
  }
}

export const exportService = new ExportService();