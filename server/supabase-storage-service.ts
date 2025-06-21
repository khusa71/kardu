import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseStorageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'kardu-bucket';

let supabase: any = null;

if (supabaseUrl && supabaseServiceKey && supabaseStorageBucket) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);

}

export interface StoredFile {
  key: string;
  url: string;
  contentType: string;
  size: number;
}

export class SupabaseStorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'studycards-files';
    this.initializeBucket();
  }

  private async initializeBucket(): Promise<void> {
    if (!supabase) return;

    try {
      // Check if bucket exists, create if not
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some((bucket: any) => bucket.name === this.bucketName);

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(this.bucketName, {
          public: false,
          allowedMimeTypes: ['application/pdf', 'text/csv', 'application/json'],
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
        });

        if (error) {
          console.error('Failed to create Supabase storage bucket:', error);
        } else {
          console.log('✅ Supabase storage bucket created');
        }
      }
    } catch (error) {
      console.error('Error initializing Supabase storage bucket:', error);
    }
  }

  private generateFileKey(userId: string, jobId: number, filename: string, type: 'pdf' | 'anki' | 'csv' | 'json' | 'quizlet'): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userId}/${jobId}/${type}/${timestamp}_${sanitizedFilename}`;
  }

  async uploadPDF(userId: string, jobId: number, fileBuffer: Buffer, originalFilename: string): Promise<StoredFile> {
    if (!supabase) throw new Error('Supabase storage not initialized');

    const fileKey = this.generateFileKey(userId, jobId, originalFilename, 'pdf');
    
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileKey, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileKey);

    return {
      key: fileKey,
      url: publicUrl,
      contentType: 'application/pdf',
      size: fileBuffer.length,
    };
  }

  async uploadAnkiDeck(userId: string, jobId: number, ankiBuffer: Buffer): Promise<StoredFile> {
    if (!supabase) throw new Error('Supabase storage not initialized');

    const filename = `flashcards_${Date.now()}.apkg`;
    const fileKey = this.generateFileKey(userId, jobId, filename, 'anki');

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileKey, ankiBuffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload Anki deck: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileKey);

    return {
      key: fileKey,
      url: publicUrl,
      contentType: 'application/octet-stream',
      size: ankiBuffer.length,
    };
  }

  async uploadCSVExport(userId: string, jobId: number, csvContent: string): Promise<StoredFile> {
    if (!supabase) throw new Error('Supabase storage not initialized');

    const filename = `flashcards_${Date.now()}.csv`;
    const fileKey = this.generateFileKey(userId, jobId, filename, 'csv');
    const csvBuffer = Buffer.from(csvContent, 'utf-8');

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileKey, csvBuffer, {
        contentType: 'text/csv',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload CSV: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileKey);

    return {
      key: fileKey,
      url: publicUrl,
      contentType: 'text/csv',
      size: csvBuffer.length,
    };
  }

  async uploadJSONExport(userId: string, jobId: number, jsonContent: string): Promise<StoredFile> {
    if (!supabase) throw new Error('Supabase storage not initialized');

    const filename = `flashcards_${Date.now()}.json`;
    const fileKey = this.generateFileKey(userId, jobId, filename, 'json');
    const jsonBuffer = Buffer.from(jsonContent, 'utf-8');

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileKey, jsonBuffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload JSON: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileKey);

    return {
      key: fileKey,
      url: publicUrl,
      contentType: 'application/json',
      size: jsonBuffer.length,
    };
  }

  async uploadQuizletExport(userId: string, jobId: number, quizletContent: string): Promise<StoredFile> {
    if (!supabase) throw new Error('Supabase storage not initialized');

    const filename = `flashcards_quizlet_${Date.now()}.txt`;
    const fileKey = this.generateFileKey(userId, jobId, filename, 'quizlet');
    const quizletBuffer = Buffer.from(quizletContent, 'utf-8');

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileKey, quizletBuffer, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload Quizlet export: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(fileKey);

    return {
      key: fileKey,
      url: publicUrl,
      contentType: 'text/plain',
      size: quizletBuffer.length,
    };
  }

  async downloadFile(key: string): Promise<Buffer> {
    if (!supabase) throw new Error('Supabase storage not initialized');

    try {
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .download(key);

      if (error) {
        console.error('Supabase storage download error:', error);
        throw new Error(`File download failed: ${error.message || 'Unknown error'}`);
      }

      if (!data) {
        throw new Error('No data received from storage');
      }

      // Safely convert to buffer with error handling
      try {
        const arrayBuffer = await data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (conversionError) {
        console.error('Error converting file data to buffer:', conversionError);
        throw new Error('Failed to process downloaded file');
      }
    } catch (error) {
      console.error('Download operation failed:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('File download failed');
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([key]);

    if (error) {
      console.error('Failed to delete file:', error);
      return false;
    }

    return true;
  }

  async listUserFiles(userId: string): Promise<string[]> {
    if (!supabase) return [];

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .list(`${userId}/`, {
        limit: 100,
      });

    if (error) {
      console.error('Failed to list user files:', error);
      return [];
    }

    return data?.map((file: any) => file.name) || [];
  }

  async generateAndUploadExports(userId: string, jobId: number, flashcards: any[]): Promise<{
    csv?: StoredFile;
    json?: StoredFile;
    quizlet?: StoredFile;
  }> {
    const results: { csv?: StoredFile; json?: StoredFile; quizlet?: StoredFile } = {};

    try {
      // Generate CSV
      const csvContent = this.generateCSVContent(flashcards);
      results.csv = await this.uploadCSVExport(userId, jobId, csvContent);

      // Generate JSON
      const jsonContent = JSON.stringify(flashcards, null, 2);
      results.json = await this.uploadJSONExport(userId, jobId, jsonContent);

      // Generate Quizlet
      const quizletContent = this.generateQuizletContent(flashcards);
      results.quizlet = await this.uploadQuizletExport(userId, jobId, quizletContent);

    } catch (error) {
      console.error('Error generating exports:', error);
    }

    return results;
  }

  private generateCSVContent(flashcards: any[]): string {
    const header = 'Front,Back\n';
    const rows = flashcards.map(card => 
      `"${this.escapeCsv(card.front)}","${this.escapeCsv(card.back)}"`
    ).join('\n');
    return header + rows;
  }

  private generateQuizletContent(flashcards: any[]): string {
    return flashcards.map(card => 
      `${this.cleanForQuizlet(card.front)}\t${this.cleanForQuizlet(card.back)}`
    ).join('\n');
  }

  private escapeCsv(text: string): string {
    if (!text) return '';
    return text.replace(/"/g, '""');
  }

  private cleanForQuizlet(text: string): string {
    if (!text) return '';
    return text.replace(/\t/g, ' ').replace(/\n/g, ' ').trim();
  }
}

export const supabaseStorage = new SupabaseStorageService();