import fs from "fs";
import path from "path";

export interface StoredFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export class ObjectStorageService {
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

  // Upload Anki deck file
  async uploadAnkiDeck(userId: string, jobId: number, localFilePath: string): Promise<StoredFile> {
    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const filename = `flashcards_${jobId}.apkg`;
      const key = this.generateFileKey(userId, jobId, filename, 'anki');
      
      const result = await this.client.upload(key, fileBuffer);
      
      if (!result.success) {
        throw new Error(`Upload failed: ${result.error}`);
      }

      const urlResult = await this.client.getDownloadUrl(key);
      const url = urlResult.success ? urlResult.url : '';
      
      return {
        key,
        url,
        contentType: 'application/octet-stream',
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('Error uploading Anki deck to object storage:', error);
      throw new Error('Failed to upload Anki deck to storage');
    }
  }

  // Upload CSV export
  async uploadCSVExport(userId: string, jobId: number, csvContent: string): Promise<StoredFile> {
    try {
      const buffer = Buffer.from(csvContent, 'utf8');
      const filename = `flashcards_${jobId}.csv`;
      const key = this.generateFileKey(userId, jobId, filename, 'csv');
      
      await this.client.uploadFromBuffer(key, buffer, {
        contentType: 'text/csv'
      });

      const url = await this.client.getDownloadUrl(key);
      
      return {
        key,
        url,
        contentType: 'text/csv',
        size: buffer.length
      };
    } catch (error) {
      console.error('Error uploading CSV to object storage:', error);
      throw new Error('Failed to upload CSV to storage');
    }
  }

  // Upload JSON export
  async uploadJSONExport(userId: string, jobId: number, jsonContent: string): Promise<StoredFile> {
    try {
      const buffer = Buffer.from(jsonContent, 'utf8');
      const filename = `flashcards_${jobId}.json`;
      const key = this.generateFileKey(userId, jobId, filename, 'json');
      
      await this.client.uploadFromBuffer(key, buffer, {
        contentType: 'application/json'
      });

      const url = await this.client.getDownloadUrl(key);
      
      return {
        key,
        url,
        contentType: 'application/json',
        size: buffer.length
      };
    } catch (error) {
      console.error('Error uploading JSON to object storage:', error);
      throw new Error('Failed to upload JSON to storage');
    }
  }

  // Upload Quizlet export
  async uploadQuizletExport(userId: string, jobId: number, quizletContent: string): Promise<StoredFile> {
    try {
      const buffer = Buffer.from(quizletContent, 'utf8');
      const filename = `flashcards_${jobId}_quizlet.txt`;
      const key = this.generateFileKey(userId, jobId, filename, 'quizlet');
      
      await this.client.uploadFromBuffer(key, buffer, {
        contentType: 'text/plain'
      });

      const url = await this.client.getDownloadUrl(key);
      
      return {
        key,
        url,
        contentType: 'text/plain',
        size: buffer.length
      };
    } catch (error) {
      console.error('Error uploading Quizlet export to object storage:', error);
      throw new Error('Failed to upload Quizlet export to storage');
    }
  }

  // Get download URL for an existing file
  async getDownloadUrl(key: string): Promise<string> {
    try {
      return await this.client.getDownloadUrl(key);
    } catch (error) {
      console.error('Error getting download URL from object storage:', error);
      throw new Error('Failed to get download URL');
    }
  }

  // Download file as buffer
  async downloadFile(key: string): Promise<Buffer> {
    try {
      return await this.client.downloadAsBuffer(key);
    } catch (error) {
      console.error('Error downloading file from object storage:', error);
      throw new Error('Failed to download file');
    }
  }

  // Check if file exists
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.getDownloadUrl(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Delete file from storage
  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.delete(key);
    } catch (error) {
      console.error('Error deleting file from object storage:', error);
      // Don't throw error for deletion failures to avoid breaking the flow
    }
  }

  // List all files for a user
  async listUserFiles(userId: string): Promise<string[]> {
    try {
      return await this.client.list(`users/${userId}/`);
    } catch (error) {
      console.error('Error listing user files from object storage:', error);
      return [];
    }
  }

  // Generate export files and upload them all at once
  async generateAndUploadExports(userId: string, jobId: number, flashcards: any[]): Promise<{
    csv?: StoredFile;
    json?: StoredFile;
    quizlet?: StoredFile;
  }> {
    const results: { csv?: StoredFile; json?: StoredFile; quizlet?: StoredFile } = {};

    try {
      // Generate CSV content
      const csvContent = this.generateCSVContent(flashcards);
      results.csv = await this.uploadCSVExport(userId, jobId, csvContent);

      // Generate JSON content
      const jsonContent = JSON.stringify(flashcards, null, 2);
      results.json = await this.uploadJSONExport(userId, jobId, jsonContent);

      // Generate Quizlet content
      const quizletContent = this.generateQuizletContent(flashcards);
      results.quizlet = await this.uploadQuizletExport(userId, jobId, quizletContent);

      return results;
    } catch (error) {
      console.error('Error generating and uploading exports:', error);
      return results; // Return partial results
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

export const objectStorage = new ObjectStorageService();