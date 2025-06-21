import { db } from "./db";
import { flashcardJobs, flashcards, studyProgress } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Complete normalized flashcard migration implementation
 * This fixes the study mechanism by moving from JSON storage to normalized tables
 */

// Temporary schema extension for migration
const tempFlashcardJobs = {
  ...flashcardJobs,
  flashcards: sql`flashcards`, // Temporary access to legacy JSON field
};

export async function executeNormalizedMigration() {
  console.log("Starting normalized flashcard migration...");
  
  try {
    // Step 1: Create flashcards table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS flashcards (
        id SERIAL PRIMARY KEY,
        job_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL,
        card_index INTEGER NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        subject TEXT,
        difficulty TEXT,
        tags TEXT[],
        confidence NUMERIC(3,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Step 2: Create indexes for performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_flashcards_job ON flashcards(job_id);
      CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
      CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);
      CREATE INDEX IF NOT EXISTS idx_flashcards_unique ON flashcards(job_id, card_index);
    `);

    // Step 3: Add foreign key constraints
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE flashcards 
        ADD CONSTRAINT fk_flashcards_job 
        FOREIGN KEY (job_id) REFERENCES flashcard_jobs(id) ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE flashcards 
        ADD CONSTRAINT fk_flashcards_user 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id);
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Step 4: Update study_progress table structure
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE study_progress 
        ADD COLUMN flashcard_id INTEGER;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE study_progress 
        ADD COLUMN correct_streak INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE study_progress 
        ADD COLUMN total_reviews INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE study_progress 
        ADD COLUMN correct_reviews INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN null;
      END $$;
    `);

    // Step 5: Migrate existing data
    const jobs = await db.execute(sql`
      SELECT id, user_id, subject, difficulty, flashcards 
      FROM flashcard_jobs 
      WHERE status = 'completed' AND flashcards IS NOT NULL
    `);

    console.log(`Found ${jobs.length} jobs with flashcard data to migrate`);

    for (const job of jobs) {
      try {
        const jobId = job.id as number;
        const userId = job.user_id as string;
        const subject = job.subject as string;
        const difficulty = job.difficulty as string;
        const flashcardsJson = job.flashcards as string;

        // Check if already migrated
        const existing = await db.execute(sql`
          SELECT COUNT(*) as count FROM flashcards WHERE job_id = ${jobId}
        `);

        if ((existing[0]?.count as number) > 0) {
          console.log(`Job ${jobId} already migrated, skipping...`);
          continue;
        }

        // Parse and migrate flashcards
        const flashcardsData = JSON.parse(flashcardsJson);
        
        for (let i = 0; i < flashcardsData.length; i++) {
          const card = flashcardsData[i];
          
          await db.execute(sql`
            INSERT INTO flashcards (job_id, user_id, card_index, front, back, subject, difficulty, tags, confidence)
            VALUES (
              ${jobId},
              ${userId},
              ${i},
              ${card.front || card.question || ''},
              ${card.back || card.answer || ''},
              ${card.subject || subject || ''},
              ${card.difficulty || difficulty || 'beginner'},
              ${card.tags || []},
              ${card.confidence ? parseFloat(card.confidence.toString()) : null}
            )
          `);
        }

        console.log(`Migrated ${flashcardsData.length} flashcards for job ${jobId}`);

      } catch (error) {
        console.error(`Failed to migrate job ${job.id}:`, error);
      }
    }

    console.log("Normalized flashcard migration completed successfully");
    return true;

  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

/**
 * Create normalized flashcard records for new jobs
 */
export async function createNormalizedFlashcards(
  jobId: number,
  userId: string,
  flashcards: any[],
  subject: string,
  difficulty: string
): Promise<void> {
  const normalizedFlashcards = flashcards.map((card: any, index: number) => ({
    jobId,
    userId,
    cardIndex: index,
    front: card.front || card.question || '',
    back: card.back || card.answer || '',
    subject: card.subject || subject || '',
    difficulty: card.difficulty || difficulty || 'beginner',
    tags: card.tags || [],
    confidence: card.confidence ? card.confidence.toString() : null,
  }));

  if (normalizedFlashcards.length > 0) {
    // Delete existing flashcards for this job first
    await db.execute(sql`DELETE FROM flashcards WHERE job_id = ${jobId}`);
    
    // Insert normalized flashcards one by one
    for (const flashcard of normalizedFlashcards) {
      await db.execute(sql`
        INSERT INTO flashcards (job_id, user_id, card_index, front, back, subject, difficulty)
        VALUES (
          ${flashcard.jobId},
          ${flashcard.userId},
          ${flashcard.cardIndex},
          ${flashcard.front},
          ${flashcard.back},
          ${flashcard.subject || ''},
          ${flashcard.difficulty || 'beginner'}
        )
      `);
    }
  }
}

/**
 * Get flashcards from normalized table for study session
 */
export async function getNormalizedFlashcards(jobId: number) {
  return await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.jobId, jobId))
    .orderBy(flashcards.cardIndex);
}

/**
 * Get flashcards with progress for optimized study mode
 */
export async function getFlashcardsWithProgress(jobId: number, userId: string) {
  const flashcardData = await db
    .select({
      id: flashcards.id,
      cardIndex: flashcards.cardIndex,
      front: flashcards.front,
      back: flashcards.back,
      subject: flashcards.subject,
      difficulty: flashcards.difficulty,
      tags: flashcards.tags,
      confidence: flashcards.confidence,
      progressId: studyProgress.id,
      status: studyProgress.status,
      reviewCount: studyProgress.reviewCount,
      correctStreak: studyProgress.correctStreak,
      lastReviewedAt: studyProgress.lastReviewedAt,
      nextReviewDate: studyProgress.nextReviewDate,
    })
    .from(flashcards)
    .leftJoin(
      studyProgress,
      eq(flashcards.id, studyProgress.flashcardId)
    )
    .where(eq(flashcards.jobId, jobId));

  return flashcardData.map(card => ({
    ...card,
    progress: card.progressId ? {
      status: card.status || 'new',
      reviewCount: card.reviewCount || 0,
      correctStreak: card.correctStreak || 0,
      lastReviewedAt: card.lastReviewedAt,
      nextReviewDate: card.nextReviewDate,
    } : {
      status: 'new',
      reviewCount: 0,
      correctStreak: 0,
      lastReviewedAt: null,
      nextReviewDate: null,
    }
  }));
}