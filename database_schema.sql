-- StudyCards AI - Supabase Database Schema
-- Normalized flashcard database with proper relationships and RLS policies
-- Generated: June 21, 2025

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profiles table (synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR UNIQUE NOT NULL,
    full_name VARCHAR,
    avatar_url TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    monthly_limit INTEGER DEFAULT 3,
    monthly_uploads INTEGER DEFAULT 0,
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    subscription_status VARCHAR,
    subscription_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcard jobs table (PDF processing jobs)
CREATE TABLE IF NOT EXISTS flashcard_jobs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    page_count INTEGER,
    pages_processed INTEGER,
    pdf_storage_key TEXT,
    pdf_download_url TEXT,
    api_provider TEXT NOT NULL,
    flashcard_count INTEGER NOT NULL DEFAULT 0,
    subject TEXT,
    difficulty TEXT,
    focus_areas TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    current_task TEXT,
    error_message TEXT,
    processing_time INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    regenerated_from_job_id INTEGER
);

-- Normalized flashcards table (individual flashcard records)
CREATE TABLE IF NOT EXISTS flashcards (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    card_index INTEGER NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    subject TEXT,
    difficulty TEXT,
    tags TEXT[],
    confidence DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study progress table (individual card progress tracking)  
CREATE TABLE IF NOT EXISTS study_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
    card_index INTEGER NOT NULL,
    flashcard_id INTEGER REFERENCES flashcards(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'new',
    last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_date TIMESTAMPTZ,
    difficulty_rating TEXT,
    review_count INTEGER DEFAULT 0,
    correct_streak INTEGER DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,  
    correct_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study sessions table (session tracking)
CREATE TABLE IF NOT EXISTS study_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    total_cards INTEGER NOT NULL,
    cards_studied INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 0,
    session_duration INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    flashcard_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Temporary downloads table (on-demand file generation)
CREATE TABLE IF NOT EXISTS temporary_downloads (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
    format TEXT NOT NULL CHECK (format IN ('anki', 'csv', 'json', 'quizlet')),
    storage_key TEXT NOT NULL,
    download_url TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_premium ON user_profiles(is_premium);

CREATE INDEX IF NOT EXISTS idx_flashcard_jobs_user ON flashcard_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_jobs_status ON flashcard_jobs(status);
CREATE INDEX IF NOT EXISTS idx_flashcard_jobs_created ON flashcard_jobs(created_at);

CREATE INDEX IF NOT EXISTS idx_flashcards_job ON flashcards(job_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_unique ON flashcards(job_id, card_index);

CREATE INDEX IF NOT EXISTS idx_study_progress_user_job ON study_progress(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_flashcard ON study_progress(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_unique ON study_progress(user_id, flashcard_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_next_review ON study_progress(next_review_date);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_job ON study_sessions(job_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_temporary_downloads_user ON temporary_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_temporary_downloads_job ON temporary_downloads(job_id);
CREATE INDEX IF NOT EXISTS idx_temporary_downloads_expires ON temporary_downloads(expires_at);

-- Add unique constraints for data integrity
ALTER TABLE study_progress 
ADD CONSTRAINT IF NOT EXISTS unique_user_flashcard 
UNIQUE (user_id, flashcard_id);

ALTER TABLE flashcards
ADD CONSTRAINT IF NOT EXISTS unique_job_card_index  
UNIQUE (job_id, card_index);

-- Add check constraints for data validation
ALTER TABLE user_profiles
ADD CONSTRAINT IF NOT EXISTS check_monthly_limit_positive 
CHECK (monthly_limit >= 0);

ALTER TABLE user_profiles  
ADD CONSTRAINT IF NOT EXISTS check_monthly_uploads_positive
CHECK (monthly_uploads >= 0);

ALTER TABLE flashcard_jobs
ADD CONSTRAINT IF NOT EXISTS check_progress_range
CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE flashcard_jobs
ADD CONSTRAINT IF NOT EXISTS check_flashcard_count_positive
CHECK (flashcard_count >= 0);

ALTER TABLE flashcards
ADD CONSTRAINT IF NOT EXISTS check_confidence_range
CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE study_progress
ADD CONSTRAINT IF NOT EXISTS check_review_counts_positive
CHECK (review_count >= 0 AND correct_streak >= 0 AND total_reviews >= 0 AND correct_reviews >= 0);

ALTER TABLE study_sessions
ADD CONSTRAINT IF NOT EXISTS check_accuracy_range  
CHECK (accuracy >= 0 AND accuracy <= 100);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcard_jobs_updated_at ON flashcard_jobs;
CREATE TRIGGER update_flashcard_jobs_updated_at 
    BEFORE UPDATE ON flashcard_jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcards_updated_at ON flashcards;
CREATE TRIGGER update_flashcards_updated_at 
    BEFORE UPDATE ON flashcards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_progress_updated_at ON study_progress;
CREATE TRIGGER update_study_progress_updated_at 
    BEFORE UPDATE ON study_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_study_sessions_updated_at ON study_sessions;
CREATE TRIGGER update_study_sessions_updated_at 
    BEFORE UPDATE ON study_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (optional)
INSERT INTO user_profiles (id, email, full_name, is_premium, monthly_limit) 
VALUES (
    'admin-user-id', 
    'admin@studycards.ai', 
    'System Administrator', 
    true, 
    1000
) ON CONFLICT (id) DO NOTHING;

-- Create views for common queries
CREATE OR REPLACE VIEW flashcards_with_progress AS
SELECT 
    f.*,
    sp.status as progress_status,
    sp.last_reviewed_at,
    sp.next_review_date,
    sp.review_count,
    sp.correct_streak,
    sp.total_reviews,
    sp.correct_reviews
FROM flashcards f
LEFT JOIN study_progress sp ON f.id = sp.flashcard_id;

CREATE OR REPLACE VIEW user_study_stats AS  
SELECT 
    up.id as user_id,
    up.email,
    COUNT(DISTINCT fj.id) as total_jobs,
    COUNT(DISTINCT f.id) as total_flashcards,
    COUNT(DISTINCT sp.id) as cards_studied,
    AVG(CASE WHEN sp.total_reviews > 0 THEN (sp.correct_reviews::float / sp.total_reviews * 100) END) as avg_accuracy
FROM user_profiles up
LEFT JOIN flashcard_jobs fj ON up.id = fj.user_id
LEFT JOIN flashcards f ON fj.id = f.job_id  
LEFT JOIN study_progress sp ON f.id = sp.flashcard_id
GROUP BY up.id, up.email;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for flashcard_jobs
CREATE POLICY "Users can view own jobs" ON flashcard_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON flashcard_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON flashcard_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON flashcard_jobs
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for flashcards
CREATE POLICY "Users can view own flashcards" ON flashcards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own flashcards" ON flashcards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own flashcards" ON flashcards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own flashcards" ON flashcards
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_progress
CREATE POLICY "Users can view own study progress" ON study_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study progress" ON study_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study progress" ON study_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study progress" ON study_progress
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for study_sessions
CREATE POLICY "Users can view own study sessions" ON study_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study sessions" ON study_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions" ON study_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions" ON study_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on temporary_downloads table
ALTER TABLE temporary_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for temporary_downloads
CREATE POLICY "Users can view own downloads" ON temporary_downloads
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own downloads" ON temporary_downloads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can cleanup expired downloads" ON temporary_downloads
    FOR DELETE USING (expires_at < NOW());

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage policies for file uploads (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdf-uploads', 'pdf-uploads', false),
       ('exports', 'exports', false),
       ('anki-decks', 'anki-decks', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'pdf-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (bucket_id = 'pdf-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'pdf-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Temporary export files policies (1-hour expiry)
CREATE POLICY "Users can view their own temporary exports" ON storage.objects
  FOR SELECT USING (bucket_id IN ('exports', 'anki-decks') AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "System can manage temporary export files" ON storage.objects
  FOR ALL USING (bucket_id IN ('exports', 'anki-decks'));

-- Function to cleanup expired downloads and files
CREATE OR REPLACE FUNCTION cleanup_expired_downloads()
RETURNS void AS $$
DECLARE
    expired_record RECORD;
BEGIN
    -- Get expired downloads
    FOR expired_record IN 
        SELECT storage_key FROM temporary_downloads WHERE expires_at < NOW()
    LOOP
        -- Delete from storage (this would be handled by application code)
        -- DELETE FROM storage.objects WHERE name = expired_record.storage_key;
        NULL; -- Placeholder for storage cleanup
    END LOOP;
    
    -- Delete expired records from database
    DELETE FROM temporary_downloads WHERE expires_at < NOW();
    
    RAISE NOTICE 'Cleaned up expired downloads';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup to run periodically (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-downloads', '0 * * * *', 'SELECT cleanup_expired_downloads();');

-- Final verification
SELECT 'Supabase database schema created successfully' as status;
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'flashcard_jobs', 'flashcards', 'study_progress', 'study_sessions', 'temporary_downloads')
ORDER BY tablename;