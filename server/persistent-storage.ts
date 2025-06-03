import fs from "fs";
import path from "path";

export interface StoredFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export class PersistentStorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'persistent_storage');
    this.ensureStorageDir();
  }

  private ensureStorageDir(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  // Generate a unique file path with user-specific organization
  private generateFilePath(userId: string, jobId: number, filename: string, type: 'pdf' | 'anki' | 'csv' | 'json' | 'quizlet'): string {
    const userDir = path.join(this.storageDir, 'users', userId, 'jobs', jobId.toString(), type);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return path.join(userDir, `${timestamp}_${sanitizedFilename}`);
  }

  // Store original PDF file
  async storePDF(userId: string, jobId: number, localFilePath: string, originalFilename: string): Promise<StoredFile> {
    try {
      const targetPath = this.generateFilePath(userId, jobId, originalFilename, 'pdf');
      
      // Copy file to persistent storage
      fs.copyFileSync(localFilePath, targetPath);
      
      const stats = fs.statSync(targetPath);
      const relativeKey = path.relative(this.storageDir, targetPath);
      
      return {
        key: relativeKey,
        url: `/api/storage/download/${encodeURIComponent(relativeKey)}`,
        contentType: 'application/pdf',
        size: stats.size
      };
    } catch (error) {
      console.error('Error storing PDF:', error);
      throw new Error('Failed to store PDF');
    }
  }

  // Store Anki deck file
  async storeAnkiDeck(userId: string, jobId: number, localFilePath: string): Promise<StoredFile> {
    try {
      const filename = `flashcards_${jobId}.apkg`;
      const targetPath = this.generateFilePath(userId, jobId, filename, 'anki');
      
      // Copy file to persistent storage
      fs.copyFileSync(localFilePath, targetPath);
      
      const stats = fs.statSync(targetPath);
      const relativeKey = path.relative(this.storageDir, targetPath);
      
      return {
        key: relativeKey,
        url: `/api/storage/download/${encodeURIComponent(relativeKey)}`,
        contentType: 'application/octet-stream',
        size: stats.size
      };
    } catch (error) {
      console.error('Error storing Anki deck:', error);
      throw new Error('Failed to store Anki deck');
    }
  }

  // Store export files
  async storeExportFile(userId: string, jobId: number, content: string, type: 'csv' | 'json' | 'quizlet'): Promise<StoredFile> {
    try {
      const extensions = { csv: '.csv', json: '.json', quizlet: '.txt' };
      const contentTypes = { 
        csv: 'text/csv', 
        json: 'application/json', 
        quizlet: 'text/plain' 
      };
      
      const filename = `flashcards_${jobId}${type === 'quizlet' ? '_quizlet' : ''}${extensions[type]}`;
      const targetPath = this.generateFilePath(userId, jobId, filename, type);
      
      // Write content to file
      fs.writeFileSync(targetPath, content, 'utf8');
      
      const stats = fs.statSync(targetPath);
      const relativeKey = path.relative(this.storageDir, targetPath);
      
      return {
        key: relativeKey,
        url: `/api/storage/download/${encodeURIComponent(relativeKey)}`,
        contentType: contentTypes[type],
        size: stats.size
      };
    } catch (error) {
      console.error(`Error storing ${type} export:`, error);
      throw new Error(`Failed to store ${type} export`);
    }
  }

  // Generate and store all export formats
  async generateAndStoreExports(userId: string, jobId: number, flashcards: any[]): Promise<{
    csv?: StoredFile;
    json?: StoredFile;
    quizlet?: StoredFile;
  }> {
    const results: { csv?: StoredFile; json?: StoredFile; quizlet?: StoredFile } = {};

    try {
      // Generate CSV content
      const csvContent = this.generateCSVContent(flashcards);
      results.csv = await this.storeExportFile(userId, jobId, csvContent, 'csv');

      // Generate JSON content
      const jsonContent = JSON.stringify(flashcards, null, 2);
      results.json = await this.storeExportFile(userId, jobId, jsonContent, 'json');

      // Generate Quizlet content
      const quizletContent = this.generateQuizletContent(flashcards);
      results.quizlet = await this.storeExportFile(userId, jobId, quizletContent, 'quizlet');

      return results;
    } catch (error) {
      console.error('Error generating and storing exports:', error);
      return results; // Return partial results
    }
  }

  // Get file path from storage key
  getFilePath(key: string): string {
    return path.join(this.storageDir, key);
  }

  // Check if file exists
  fileExists(key: string): boolean {
    try {
      const filePath = this.getFilePath(key);
      return fs.existsSync(filePath);
    } catch (error) {
      return false;
    }
  }

  // Delete file
  deleteFile(key: string): void {
    try {
      const filePath = this.getFilePath(key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw error for deletion failures
    }
  }

  // Helper method to generate CSV content
  private generateCSVContent(flashcards: any[]): string {
    const header = 'Question,Answer,Topic,Difficulty\n';
    const rows = flashcards.map(card => {
      const question = this.escapeCsv(card.question || '');
      const answer = this.escapeCsv(card.answer || '');
      const topic = this.escapeCsv(card.topic || '');
      const difficulty = this.escapeCsv(card.difficulty || '');
      return `"${question}","${answer}","${topic}","${difficulty}"`;
    }).join('\n');
    
    return header + rows;
  }

  // Helper method to generate Quizlet content
  private generateQuizletContent(flashcards: any[]): string {
    return flashcards.map(card => {
      const question = this.cleanForQuizlet(card.question || '');
      const answer = this.cleanForQuizlet(card.answer || '');
      return `${question}\t${answer}`;
    }).join('\n');
  }

  // Helper method to escape CSV fields
  private escapeCsv(text: string): string {
    return text.replace(/"/g, '""');
  }

  // Helper method to clean text for Quizlet format
  private cleanForQuizlet(text: string): string {
    return text
      .replace(/\t/g, ' ')
      .replace(/\n/g, ' ')
      .replace(/\r/g, ' ')
      .trim();
  }
}

export const persistentStorage = new PersistentStorageService();