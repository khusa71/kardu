import { db } from "./db";
import { flashcards, temporaryDownloads, type FlashcardPair } from "@shared/schema";
import { eq, and, lt } from "drizzle-orm";
import { exportService } from "./export-service";
import { createClient } from '@supabase/supabase-js';
import fs from "fs";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

export interface DownloadResult {
  downloadUrl: string;
  filePath: string;
  filename: string;
  expiresAt?: Date;
  fromCache?: boolean;
}

export class OnDemandDownloadService {
  private readonly EXPIRY_HOURS = 1;
  /**
   * Generate download file for a specific format
   */
  async generateDownload(
    userId: string,
    jobId: number,
    format: 'anki' | 'csv' | 'json' | 'quizlet'
  ): Promise<DownloadResult> {
    // Get flashcards for the job
    const flashcardData = await db
      .select()
      .from(flashcards)
      .where(and(
        eq(flashcards.jobId, jobId),
        eq(flashcards.userId, userId)
      ))
      .orderBy(flashcards.cardIndex);

    if (flashcardData.length === 0) {
      throw new Error("No flashcards found for this job");
    }

    // Convert to FlashcardPair format for export service
    const flashcardPairs: FlashcardPair[] = flashcardData.map(card => ({
      front: card.front,
      back: card.back,
      subject: card.subject || '',
      difficulty: (card.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      tags: card.tags || []
    }));

    // Generate temporary file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `job-${jobId}-${format}-${timestamp}`;
    let filePath: string;
    let downloadFilename: string;

    // Generate file based on format
    switch (format) {
      case 'csv':
        filePath = await exportService.exportToCSV(flashcardPairs, path.join(tempDir, `${filename}.csv`));
        downloadFilename = `flashcards-${jobId}.csv`;
        break;
      case 'json':
        filePath = await exportService.exportToJSON(flashcardPairs, path.join(tempDir, `${filename}.json`));
        downloadFilename = `flashcards-${jobId}.json`;
        break;
      case 'quizlet':
        filePath = await exportService.exportToQuizlet(flashcardPairs, path.join(tempDir, `${filename}.txt`));
        downloadFilename = `flashcards-${jobId}.txt`;
        break;
      case 'anki':
        // For Anki, generate a simple tab-separated file
        const ankiContent = flashcardPairs.map(card => 
          `${card.front}\t${card.back}`
        ).join('\n');
        filePath = path.join(tempDir, `${filename}.txt`);
        fs.writeFileSync(filePath, ankiContent);
        downloadFilename = `flashcards-${jobId}.txt`;
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    return {
      downloadUrl: `/temp/${path.basename(filePath)}`,
      filePath,
      filename: downloadFilename
    };
  }

  /**
   * Generate new download file and store temporarily
   */
  private async generateNewDownload(
    userId: string,
    jobId: number,
    format: 'anki' | 'csv' | 'json' | 'quizlet'
  ): Promise<DownloadResult> {
    // Get flashcards for the job
    const flashcardData = await db
      .select()
      .from(flashcards)
      .where(and(
        eq(flashcards.jobId, jobId),
        eq(flashcards.userId, userId)
      ))
      .orderBy(flashcards.cardIndex);

    if (flashcardData.length === 0) {
      throw new Error("No flashcards found for this job");
    }

    // Convert to FlashcardPair format for export service
    const flashcardPairs = flashcardData.map(card => ({
      front: card.front,
      back: card.back,
      subject: card.subject || '',
      difficulty: (card.difficulty as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
      tags: card.tags || []
    }));

    // Generate temporary file
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const filename = `job-${jobId}-${format}-${timestamp}`;
    const tempFilePath = path.join(tempDir, filename);

    let exportedFilePath: string;
    let mimeType: string;
    let fileExtension: string;

    // Generate file based on format
    switch (format) {
      case 'csv':
        exportedFilePath = await exportService.exportToCSV(flashcardPairs, `${tempFilePath}.csv`);
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'json':
        exportedFilePath = await exportService.exportToJSON(flashcardPairs, `${tempFilePath}.json`);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
      case 'quizlet':
        exportedFilePath = await exportService.exportToQuizlet(flashcardPairs, `${tempFilePath}.txt`);
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
      case 'anki':
        // For Anki, we'll need to generate the .apkg file
        const ankiPath = await this.generateAnkiDeck(jobId, flashcardPairs, `${tempFilePath}.apkg`);
        exportedFilePath = ankiPath;
        mimeType = 'application/octet-stream';
        fileExtension = 'apkg';
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    // Upload to temporary storage
    const fileBuffer = fs.readFileSync(exportedFilePath);
    const storageKey = `temp-downloads/${userId}/${jobId}/${filename}.${fileExtension}`;
    
    // Upload to Supabase storage directly using the client
    const { data, error } = await supabase.storage
      .from('exports')
      .upload(storageKey, fileBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('exports')
      .getPublicUrl(storageKey);

    // Clean up local temp file
    fs.unlinkSync(exportedFilePath);

    // Store download record with expiry
    const expiresAt = new Date(Date.now() + this.EXPIRY_HOURS * 60 * 60 * 1000);
    
    await db.insert(temporaryDownloads).values({
      userId,
      jobId,
      format,
      storageKey,
      downloadUrl: publicUrl,
      expiresAt
    });

    return {
      downloadUrl: publicUrl,
      filePath: storageKey,
      filename: `${filename}.${fileExtension}`,
      expiresAt,
      fromCache: false
    };
  }

  /**
   * Generate Anki deck file (placeholder - would use Python anki-generator)
   */
  private async generateAnkiDeck(
    jobId: number,
    flashcards: any[],
    outputPath: string
  ): Promise<string> {
    // This would call the Python Anki generator script
    // For now, create a simple text file as placeholder
    const ankiContent = flashcards.map((card, index) => 
      `${card.front}\t${card.back}`
    ).join('\n');
    
    fs.writeFileSync(outputPath, ankiContent);
    return outputPath;
  }

  /**
   * Cleanup old temporary files
   */
  async cleanupTempFiles(): Promise<number> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      return 0;
    }

    let cleanedCount = 0;
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        try {
          fs.unlinkSync(filePath);
          cleanedCount++;
        } catch (error) {
          console.error(`Failed to delete temp file ${file}:`, error);
        }
      }
    }

    return cleanedCount;
  }
}

export const onDemandDownloadService = new OnDemandDownloadService();