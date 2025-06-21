-- Migration Script: Existing Database to Normalized Flashcard Structure
-- This script safely migrates your existing data to the new normalized schema

-- Step 1: Backup existing data (optional but recommended)
CREATE TABLE IF NOT EXISTS backup_flashcard_jobs AS 
SELECT * FROM flashcard_jobs;

CREATE TABLE IF NOT EXISTS backup_study_progress AS 
SELECT * FROM study_progress;

-- Step 2: Add new columns to existing tables (if they don't exist)
DO $$ 
BEGIN
    -- Add flashcard_count to flashcard_jobs if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcard_jobs' AND column_name = 'flashcard_count') THEN
        ALTER TABLE flashcard_jobs ADD COLUMN flashcard_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add ai_model to flashcard_jobs if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'flashcard_jobs' AND column_name = 'ai_model') THEN
        ALTER TABLE flashcard_jobs ADD COLUMN ai_model TEXT DEFAULT 'openai/gpt-4o';
    END IF;
    
    -- Remove old export storage columns if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'anki_storage_key') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN anki_storage_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'csv_storage_key') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN csv_storage_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'json_storage_key') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN json_storage_key;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'quizlet_storage_key') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN quizlet_storage_key;
    END IF;
    
    -- Remove download URL columns
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'anki_download_url') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN anki_download_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'csv_download_url') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN csv_download_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'json_download_url') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN json_download_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'flashcard_jobs' AND column_name = 'quizlet_download_url') THEN
        ALTER TABLE flashcard_jobs DROP COLUMN quizlet_download_url;
    END IF;
END $$;

-- Step 3: Create flashcards table if it doesn't exist
CREATE TABLE IF NOT EXISTS flashcards (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
  card_index INTEGER NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  subject TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  tags TEXT[] DEFAULT '{}',
  confidence_score REAL DEFAULT 0.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(job_id, card_index)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_flashcards_job_id ON flashcards(job_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_difficulty ON flashcards(difficulty);

-- Step 4: Migrate existing JSON flashcard data to normalized structure
DO $$
DECLARE
    job_record RECORD;
    flashcard_data JSONB;
    flashcard_item JSONB;
    card_index INTEGER;
BEGIN
    -- Only process jobs that have flashcards JSON data but no normalized flashcards yet
    FOR job_record IN 
        SELECT id, flashcards, subject, difficulty 
        FROM flashcard_jobs 
        WHERE flashcards IS NOT NULL 
        AND NOT EXISTS (SELECT 1 FROM flashcards WHERE job_id = flashcard_jobs.id)
    LOOP
        card_index := 0;
        
        -- Parse JSON and create individual flashcard records
        FOR flashcard_item IN SELECT * FROM jsonb_array_elements(job_record.flashcards)
        LOOP
            INSERT INTO flashcards (
                job_id, 
                card_index, 
                front, 
                back, 
                subject, 
                difficulty,
                confidence_score
            ) VALUES (
                job_record.id,
                card_index,
                flashcard_item->>'front',
                flashcard_item->>'back',
                COALESCE(flashcard_item->>'subject', job_record.subject),
                COALESCE(flashcard_item->>'difficulty', job_record.difficulty, 'intermediate'),
                COALESCE((flashcard_item->>'confidence')::REAL, 0.0)
            );
            
            card_index := card_index + 1;
        END LOOP;
        
        -- Update flashcard_count
        UPDATE flashcard_jobs 
        SET flashcard_count = card_index 
        WHERE id = job_record.id;
        
        RAISE NOTICE 'Migrated % flashcards for job %', card_index, job_record.id;
    END LOOP;
END $$;

-- Step 5: Update study_progress table structure
DO $$
BEGIN
    -- Add flashcard_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'study_progress' AND column_name = 'flashcard_id') THEN
        ALTER TABLE study_progress ADD COLUMN flashcard_id INTEGER;
        
        -- Add foreign key constraint
        ALTER TABLE study_progress 
        ADD CONSTRAINT fk_study_progress_flashcard 
        FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE;
    END IF;
    
    -- Add new progress tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'study_progress' AND column_name = 'correct_streak') THEN
        ALTER TABLE study_progress ADD COLUMN correct_streak INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'study_progress' AND column_name = 'total_reviews') THEN
        ALTER TABLE study_progress ADD COLUMN total_reviews INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'study_progress' AND column_name = 'correct_reviews') THEN
        ALTER TABLE study_progress ADD COLUMN correct_reviews INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 6: Link existing study progress to flashcard records
UPDATE study_progress 
SET flashcard_id = flashcards.id
FROM flashcards 
WHERE study_progress.job_id = flashcards.job_id 
AND study_progress.card_index = flashcards.card_index
AND study_progress.flashcard_id IS NULL;

-- Step 7: Create study_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS study_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  cards_studied INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  accuracy_percentage REAL DEFAULT 0.0 CHECK (accuracy_percentage >= 0.0 AND accuracy_percentage <= 100.0),
  session_type TEXT DEFAULT 'review',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_job_id ON study_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_started_at ON study_sessions(started_at DESC);

-- Step 8: Create temporary_downloads table if it doesn't exist
CREATE TABLE IF NOT EXISTS temporary_downloads (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
  format TEXT CHECK (format IN ('csv', 'json', 'anki', 'quizlet')) NOT NULL,
  storage_key TEXT NOT NULL,
  download_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temporary_downloads_user_job ON temporary_downloads(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_temporary_downloads_expires_at ON temporary_downloads(expires_at);
CREATE INDEX IF NOT EXISTS idx_temporary_downloads_format ON temporary_downloads(format);

-- Step 9: Enable RLS on new tables
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_downloads ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for new tables
CREATE POLICY IF NOT EXISTS "Users can view flashcards from own jobs" ON flashcards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flashcard_jobs 
      WHERE flashcard_jobs.id = flashcards.job_id 
      AND flashcard_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "System can manage flashcards" ON flashcards
  FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "Users can view own sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create own sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own downloads" ON temporary_downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can create own downloads" ON temporary_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "System can cleanup expired downloads" ON temporary_downloads
  FOR DELETE USING (expires_at < NOW());

-- Step 11: Update triggers for new tables
CREATE TRIGGER IF NOT EXISTS update_flashcards_updated_at 
BEFORE UPDATE ON flashcards
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 12: Remove old flashcards JSON column (after confirming migration success)
-- CAUTION: Only run this after verifying all data has been migrated correctly
-- ALTER TABLE flashcard_jobs DROP COLUMN IF EXISTS flashcards;

-- Step 13: Grant permissions on new tables
GRANT SELECT ON flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON study_sessions TO authenticated;
GRANT SELECT, INSERT ON temporary_downloads TO authenticated;

-- Final verification query
SELECT 
    fj.id as job_id,
    fj.filename,
    fj.flashcard_count as job_flashcard_count,
    COUNT(f.id) as normalized_flashcard_count,
    CASE 
        WHEN fj.flashcard_count = COUNT(f.id) THEN 'SUCCESS'
        ELSE 'MISMATCH'
    END as migration_status
FROM flashcard_jobs fj
LEFT JOIN flashcards f ON fj.id = f.job_id
WHERE fj.flashcard_count > 0
GROUP BY fj.id, fj.filename, fj.flashcard_count
ORDER BY fj.id;

SELECT 'Migration completed successfully! Review the verification results above.' as status;