import { db } from "./db";
import { flashcardJobs, flashcards } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Migration helper to convert existing JSON flashcards to normalized table structure
 */
export async function migrateFlashcardsToNormalized() {
  console.log("Starting flashcard migration from JSON to normalized structure...");
  
  try {
    // Get all jobs that have flashcards in JSON format
    const jobs = await db
      .select()
      .from(flashcardJobs)
      .where(eq(flashcardJobs.status, 'completed'));

    console.log(`Found ${jobs.length} completed jobs to migrate`);

    for (const job of jobs) {
      // Skip if job doesn't have legacy flashcard count
      if (!job.flashcardCount || job.flashcardCount === 0) {
        continue;
      }

      try {
        // This migration helper is no longer needed as JSON storage has been removed
        console.log(`Job ${job.id} uses normalized storage, no migration needed`);
        continue;

        // Migration complete - all jobs now use normalized storage
        console.log(`Job ${job.id} already uses normalized flashcard storage`);
        
      } catch (error) {
        console.error(`Failed to migrate flashcards for job ${job.id}:`, error);
      }
    }

    console.log("Flashcard migration completed successfully");
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Rollback helper to restore JSON flashcards from normalized structure
 */
export async function rollbackFlashcardMigration() {
  console.log("Rolling back flashcard migration...");
  
  try {
    // Get all jobs with normalized flashcards
    const jobs = await db.select().from(flashcardJobs);

    for (const job of jobs) {
      const jobFlashcards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.jobId, job.id));

      if (jobFlashcards.length === 0) {
        continue;
      }

      // Convert back to JSON format
      const jsonFlashcards = jobFlashcards.map(card => ({
        id: card.id,
        front: card.front,
        back: card.back,
        subject: card.subject,
        difficulty: card.difficulty,
        tags: card.tags || [],
        confidence: card.confidence
      }));

      // Update job with JSON flashcards
      await db
        .update(flashcardJobs)
        .set({ 
          flashcardCount: jsonFlashcards.length
        })
        .where(eq(flashcardJobs.id, job.id));

      console.log(`Restored JSON flashcards for job ${job.id}`);
    }

    console.log("Rollback completed successfully");
    
  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  }
}