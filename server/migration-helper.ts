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
      // Skip if job doesn't have legacy flashcards JSON
      if (!job.flashcards) {
        continue;
      }

      try {
        const flashcardsData = JSON.parse(job.flashcards);
        
        // Check if flashcards already exist in normalized table
        const existingFlashcards = await db
          .select()
          .from(flashcards)
          .where(eq(flashcards.jobId, job.id));

        if (existingFlashcards.length > 0) {
          console.log(`Job ${job.id} already has normalized flashcards, skipping...`);
          continue;
        }

        // Convert JSON flashcards to normalized records
        const normalizedFlashcards = flashcardsData.map((card: any, index: number) => ({
          jobId: job.id,
          userId: job.userId!,
          cardIndex: index,
          front: card.front || card.question || '',
          back: card.back || card.answer || '',
          subject: card.subject || job.subject || '',
          difficulty: card.difficulty || job.difficulty || 'beginner',
          tags: card.tags || [],
          confidence: card.confidence ? parseFloat(card.confidence) : null,
        }));

        // Insert normalized flashcards
        const insertedFlashcards = await db
          .insert(flashcards)
          .values(normalizedFlashcards)
          .returning();

        console.log(`Migrated ${insertedFlashcards.length} flashcards for job ${job.id}`);

        // Update job to remove JSON flashcards field (will be done via schema change)
        // For now, just log successful migration
        
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
          flashcards: JSON.stringify(jsonFlashcards)
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