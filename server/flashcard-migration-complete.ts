import { db } from "./db";
import { flashcards as flashcardsTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createNormalizedFlashcards } from "./normalized-migration";

/**
 * Complete migration utility to replace all JSON flashcard storage with normalized structure
 * This function handles the transition from storing flashcards as JSON to individual records
 */
export async function replaceJsonWithNormalizedFlashcards(
  jobId: number,
  userId: string,
  flashcards: any[],
  subject: string,
  difficulty: string
): Promise<void> {
  // Delete any existing normalized flashcards for this job
  await db.delete(flashcardsTable).where(eq(flashcardsTable.jobId, jobId));
  
  // Create new normalized flashcard records
  await createNormalizedFlashcards(jobId, userId, flashcards, subject, difficulty);
}

/**
 * Updated job progress function that uses normalized flashcards instead of JSON storage
 */
export async function updateJobProgressWithNormalizedFlashcards(
  storage: any,
  jobId: number,
  userId: string,
  flashcards: any[],
  subject: string,
  difficulty: string,
  progress: number,
  currentTask: string
): Promise<void> {
  // Create/update normalized flashcards
  await replaceJsonWithNormalizedFlashcards(jobId, userId, flashcards, subject, difficulty);
  
  // Update job with count instead of JSON data
  await storage.updateFlashcardJob(jobId, {
    progress,
    currentTask,
    flashcardCount: flashcards.length,
  });
}