-- Supabase Normalized Flashcard Schema with RLS Policies
-- Complete database structure for StudyCards AI

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS temporary_downloads CASCADE;
DROP TABLE IF EXISTS study_sessions CASCADE;
DROP TABLE IF EXISTS study_progress CASCADE;
DROP TABLE IF EXISTS flashcards CASCADE;
DROP TABLE IF EXISTS flashcard_jobs CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- User Profiles Table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'inactive', 'trialing', 'past_due', 'canceled')),
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'premium', 'pro')) DEFAULT 'free',
  uploads_this_month INTEGER DEFAULT 0,
  max_monthly_uploads INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_user_profiles_auth FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Sessions Table (for session management)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Flashcard Jobs Table (main processing jobs)
CREATE TABLE flashcard_jobs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  pdf_storage_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'intermediate',
  focus_areas JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_task TEXT DEFAULT 'Initializing...',
  error_message TEXT,
  flashcard_count INTEGER DEFAULT 0,
  page_count INTEGER,
  pages_processed INTEGER DEFAULT 0,
  processing_time INTEGER DEFAULT 0,
  ai_model TEXT DEFAULT 'openai/gpt-4o',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  regenerated_from_job_id INTEGER REFERENCES flashcard_jobs(id) ON DELETE SET NULL
);

-- Create indexes for flashcard_jobs
CREATE INDEX idx_flashcard_jobs_user_id ON flashcard_jobs(user_id);
CREATE INDEX idx_flashcard_jobs_status ON flashcard_jobs(status);
CREATE INDEX idx_flashcard_jobs_created_at ON flashcard_jobs(created_at DESC);

-- Flashcards Table (normalized individual flashcard storage)
CREATE TABLE flashcards (
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

-- Create indexes for flashcards
CREATE INDEX idx_flashcards_job_id ON flashcards(job_id);
CREATE INDEX idx_flashcards_subject ON flashcards(subject);
CREATE INDEX idx_flashcards_difficulty ON flashcards(difficulty);

-- Study Progress Table (individual card progress tracking)
CREATE TABLE study_progress (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
  flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  card_index INTEGER NOT NULL, -- For compatibility with existing frontend
  status TEXT CHECK (status IN ('new', 'reviewing', 'known')) DEFAULT 'new',
  difficulty_rating TEXT CHECK (difficulty_rating IN ('easy', 'medium', 'hard')),
  last_reviewed_at TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ,
  review_count INTEGER DEFAULT 0,
  correct_streak INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  correct_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, job_id, flashcard_id)
);

-- Create indexes for study_progress
CREATE INDEX idx_study_progress_user_job ON study_progress(user_id, job_id);
CREATE INDEX idx_study_progress_flashcard ON study_progress(flashcard_id);
CREATE INDEX idx_study_progress_next_review ON study_progress(next_review_date);
CREATE INDEX idx_study_progress_status ON study_progress(status);

-- Study Sessions Table (session tracking)
CREATE TABLE study_sessions (
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

-- Create indexes for study_sessions
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_job_id ON study_sessions(job_id);
CREATE INDEX idx_study_sessions_started_at ON study_sessions(started_at DESC);

-- Temporary Downloads Table (on-demand file generation)
CREATE TABLE temporary_downloads (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
  format TEXT CHECK (format IN ('csv', 'json', 'anki', 'quizlet')) NOT NULL,
  storage_key TEXT NOT NULL,
  download_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for temporary_downloads
CREATE INDEX idx_temporary_downloads_user_job ON temporary_downloads(user_id, job_id);
CREATE INDEX idx_temporary_downloads_expires_at ON temporary_downloads(expires_at);
CREATE INDEX idx_temporary_downloads_format ON temporary_downloads(format);

-- Enable Row Level Security on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_downloads ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS Policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions RLS Policies
CREATE POLICY "Users can manage own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

-- Flashcard Jobs RLS Policies
CREATE POLICY "Users can view own jobs" ON flashcard_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs" ON flashcard_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON flashcard_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON flashcard_jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Flashcards RLS Policies
CREATE POLICY "Users can view flashcards from own jobs" ON flashcards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flashcard_jobs 
      WHERE flashcard_jobs.id = flashcards.job_id 
      AND flashcard_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage flashcards" ON flashcards
  FOR ALL USING (true);

-- Study Progress RLS Policies
CREATE POLICY "Users can view own progress" ON study_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON study_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON study_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress" ON study_progress
  FOR DELETE USING (auth.uid() = user_id);

-- Study Sessions RLS Policies
CREATE POLICY "Users can view own sessions" ON study_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON study_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON study_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Temporary Downloads RLS Policies
CREATE POLICY "Users can view own downloads" ON temporary_downloads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own downloads" ON temporary_downloads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can cleanup expired downloads" ON temporary_downloads
  FOR DELETE USING (expires_at < NOW());

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_jobs_updated_at BEFORE UPDATE ON flashcard_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at BEFORE UPDATE ON flashcards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_progress_updated_at BEFORE UPDATE ON study_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to cleanup expired temporary downloads
CREATE OR REPLACE FUNCTION cleanup_expired_downloads()
RETURNS INTEGER 
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.temporary_downloads WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired storage files (if you have this function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_storage_files()
RETURNS INTEGER 
SET search_path = ''
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Add your cleanup logic here for storage files
  -- This is a placeholder - implement based on your storage cleanup needs
  DELETE FROM storage.objects 
  WHERE bucket_id IN ('studycards-files', 'exports') 
  AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- Grant specific permissions for authenticated users
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON flashcard_jobs TO authenticated;
GRANT SELECT ON flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON study_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE ON study_sessions TO authenticated;
GRANT SELECT, INSERT ON temporary_downloads TO authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create storage buckets (run these in Supabase Storage UI or via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('studycards-files', 'studycards-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('exports', 'exports', false);

-- Storage policies (uncomment and run after creating buckets)
/*
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'studycards-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'studycards-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'studycards-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can download own exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "System can manage exports" ON storage.objects
  FOR ALL USING (bucket_id = 'exports');
*/

-- Sample data for testing (optional)
/*
INSERT INTO user_profiles (id, email, full_name, is_premium, subscription_tier) 
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'test@example.com',
  'Test User',
  false,
  'free'
);
*/

COMMENT ON TABLE user_profiles IS 'User account information and subscription details';
COMMENT ON TABLE flashcard_jobs IS 'PDF processing jobs with status and metadata';
COMMENT ON TABLE flashcards IS 'Individual flashcard records (normalized from JSON)';
COMMENT ON TABLE study_progress IS 'Per-flashcard progress tracking with spaced repetition data';
COMMENT ON TABLE study_sessions IS 'Study session analytics and performance tracking';
COMMENT ON TABLE temporary_downloads IS 'On-demand export file generation with automatic expiry';

-- Final message
SELECT 'Normalized flashcard database schema created successfully!' as status;