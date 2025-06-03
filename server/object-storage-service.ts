import { Client } from '@replit/object-storage';
import fs from 'fs';
import path from 'path';

export interface StoredFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export class ObjectStorageService {
  private client: Client;

  constructor() {
    this.client = new Client({
      bucketId: 'replit-objstore-aa9525cc-430e-468b-9c6d-17c18a898fdd'
    });
  }

  // Generate a unique storage key for user files
  private generateFileKey(userId: string, jobId: number, filename: string, type: 'pdf' | 'anki' | 'csv' | 'json' | 'quizlet'): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `users/${userId}/jobs/${jobId}/${type}/${timestamp}_${sanitizedFilename}`;
  }

  // Upload PDF file from local path
  async uploadPDF(userId: string, jobId: number, localFilePath: string, originalFilename: string): Promise<StoredFile> {
    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const key = this.generateFileKey(userId, jobId, originalFilename, 'pdf');
      
      const { ok, error } = await this.client.uploadFromBytes(key, fileBuffer);
      if (!ok) {
        console.error("PDF Upload Error:", error);
        throw new Error(`Failed to upload PDF: ${error}`);
      }

      return {
        key,
        url: `/api/object-storage/download/${encodeURIComponent(key)}`,
        contentType: 'application/pdf',
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('Error uploading PDF to object storage:', error);
      throw new Error('Failed to upload PDF to object storage');
    }
  }

  // Upload Anki deck file
  async uploadAnkiDeck(userId: string, jobId: number, localFilePath: string): Promise<StoredFile> {
    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const filename = `flashcards_${jobId}.apkg`;
      const key = this.generateFileKey(userId, jobId, filename, 'anki');
      
      const { ok, error } = await this.client.uploadFromBytes(key, fileBuffer);
      if (!ok) {
        console.error("Anki Upload Error:", error);
        throw new Error(`Failed to upload Anki deck: ${error}`);
      }

      return {
        key,
        url: `/api/object-storage/download/${encodeURIComponent(key)}`,
        contentType: 'application/octet-stream',
        size: fileBuffer.length
      };
    } catch (error) {
      console.error('Error uploading Anki deck to object storage:', error);
      throw new Error('Failed to upload Anki deck to object storage');
    }
  }

  // Upload CSV export
  async uploadCSVExport(userId: string, jobId: number, csvContent: string): Promise<StoredFile> {
    try {
      const buffer = Buffer.from(csvContent, 'utf8');
      const filename = `flashcards_${jobId}.csv`;
      const key = this.generateFileKey(userId, jobId, filename, 'csv');
      
      const { ok, error } = await this.client.uploadFromText(key, csvContent);
      if (!ok) {
        console.error("CSV Upload Error:", error);
        throw new Error(`Failed to upload CSV: ${error}`);
      }

      return {
        key,
        url: `/api/object-storage/download/${encodeURIComponent(key)}`,
        contentType: 'text/csv',
        size: buffer.length
      };
    } catch (error) {
      console.error('Error uploading CSV to object storage:', error);
      throw new Error('Failed to upload CSV to object storage');
    }
  }

  // Upload JSON export
  async uploadJSONExport(userId: string, jobId: number, jsonContent: string): Promise<StoredFile> {
    try {
      const buffer = Buffer.from(jsonContent, 'utf8');
      const filename = `flashcards_${jobId}.json`;
      const key = this.generateFileKey(userId, jobId, filename, 'json');
      
      const { ok, error } = await this.client.uploadFromText(key, jsonContent);
      if (!ok) {
        console.error("JSON Upload Error:", error);
        throw new Error(`Failed to upload JSON: ${error}`);
      }

      return {
        key,
        url: `/api/object-storage/download/${encodeURIComponent(key)}`,
        contentType: 'application/json',
        size: buffer.length
      };
    } catch (error) {
      console.error('Error uploading JSON to object storage:', error);
      throw new Error('Failed to upload JSON to object storage');
    }
  }

  // Upload Quizlet export
  async uploadQuizletExport(userId: string, jobId: number, quizletContent: string): Promise<StoredFile> {
    try {
      const buffer = Buffer.from(quizletContent, 'utf8');
      const filename = `flashcards_${jobId}_quizlet.txt`;
      const key = this.generateFileKey(userId, jobId, filename, 'quizlet');
      
      const { ok, error } = await this.client.uploadFromText(key, quizletContent);
      if (!ok) {
        console.error("Quizlet Upload Error:", error);
        throw new Error(`Failed to upload Quizlet: ${error}`);
      }

      return {
        key,
        url: `/api/object-storage/download/${encodeURIComponent(key)}`,
        contentType: 'text/plain',
        size: buffer.length
      };
    } catch (error) {
      console.error('Error uploading Quizlet to object storage:', error);
      throw new Error('Failed to upload Quizlet to object storage');
    }
  }

  // Download file as stream
  async downloadFileStream(key: string) {
    try {
      const stream = await this.client.downloadAsStream(key);
      return stream;
    } catch (error) {
      console.error('Error downloading from object storage:', error);
      throw new Error('Failed to download file from object storage');
    }
  }

  // Check if file exists
  async fileExists(key: string): Promise<boolean> {
    try {
      const result = await this.client.list();
      if (!result.ok) return false;
      return result.value.some(file => file.name === key);
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  }

  // List user files
  async listUserFiles(userId: string): Promise<string[]> {
    try {
      const result = await this.client.list();
      if (!result.ok) {
        console.error("List Error:", result.error);
        return [];
      }
      return result.value
        .filter(file => file.name.startsWith(`users/${userId}/`))
        .map(file => file.name);
    } catch (error) {
      console.error('Error listing user files:', error);
      return [];
    }
  }

  // Delete file
  async deleteFile(key: string): Promise<boolean> {
    try {
      const { ok, error } = await this.client.delete(key);
      if (!ok) {
        console.error("Delete Error:", error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error deleting file from object storage:', error);
      return false;
    }
  }

  // Generate and upload all export formats
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