-- StudyCards AI Database Schema for Supabase
-- Run this script in your Supabase SQL Editor to create all necessary tables

-- Enable Row Level Security (RLS) for better security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create sessions table for session storage
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR PRIMARY KEY,
    sess JSONB NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index on expire column for performance
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions(expire);

-- Create user_profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id VARCHAR PRIMARY KEY NOT NULL, -- References auth.users.id
    is_premium BOOLEAN DEFAULT FALSE,
    role VARCHAR DEFAULT 'user', -- 'user' | 'admin' | 'moderator'
    monthly_uploads INTEGER DEFAULT 0,
    monthly_limit INTEGER DEFAULT 3,
    monthly_pages_processed INTEGER DEFAULT 0,
    last_upload_date TIMESTAMP,
    last_reset_date TIMESTAMP DEFAULT NOW(),
    -- Stripe integration fields
    stripe_customer_id VARCHAR,
    stripe_subscription_id VARCHAR,
    subscription_status VARCHAR, -- 'active' | 'canceled' | 'past_due' | null
    subscription_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create flashcard_jobs table
CREATE TABLE IF NOT EXISTS flashcard_jobs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR REFERENCES user_profiles(id),
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    page_count INTEGER, -- Number of pages in the PDF
    pages_processed INTEGER, -- Actual pages processed (may be less due to limits)
    pdf_storage_key TEXT, -- Object Storage key for original PDF
    pdf_download_url TEXT, -- Download URL for original PDF
    api_provider TEXT NOT NULL, -- 'openai' | 'anthropic'
    flashcard_count INTEGER NOT NULL,
    subject TEXT, -- Store subject for better categorization
    difficulty TEXT, -- Store difficulty level
    focus_areas TEXT, -- Store focus areas as JSON
    status TEXT NOT NULL, -- 'pending' | 'processing' | 'completed' | 'failed'
    progress INTEGER DEFAULT 0, -- 0-100
    current_task TEXT,
    flashcards TEXT, -- JSON string of generated flashcards
    anki_storage_key TEXT, -- Object Storage key for Anki deck
    anki_download_url TEXT, -- Download URL for Anki deck
    csv_storage_key TEXT, -- Object Storage key for CSV export
    csv_download_url TEXT, -- Download URL for CSV export
    json_storage_key TEXT, -- Object Storage key for JSON export
    json_download_url TEXT, -- Download URL for JSON export
    quizlet_storage_key TEXT, -- Object Storage key for Quizlet export
    quizlet_download_url TEXT, -- Download URL for Quizlet export
    error_message TEXT,
    processing_time INTEGER, -- Time taken in seconds
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    regenerated_from_job_id INTEGER
);

-- Create study_progress table
CREATE TABLE IF NOT EXISTS study_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES user_profiles(id),
    job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
    card_index INTEGER NOT NULL,
    status TEXT NOT NULL, -- 'known', 'unknown', 'reviewing'
    last_reviewed_at TIMESTAMP DEFAULT NOW(),
    next_review_date TIMESTAMP,
    difficulty_rating TEXT, -- 'easy', 'medium', 'hard'
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_flashcard_jobs_user_id ON flashcard_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_jobs_status ON flashcard_jobs(status);
CREATE INDEX IF NOT EXISTS idx_study_progress_user_id ON study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_job_id ON study_progress(job_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to automatically update updated_at columns
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_jobs_updated_at
    BEFORE UPDATE ON flashcard_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_progress_updated_at
    BEFORE UPDATE ON study_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Users can only access their own flashcard jobs
CREATE POLICY "Users can view own jobs" ON flashcard_jobs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own jobs" ON flashcard_jobs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own jobs" ON flashcard_jobs
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own jobs" ON flashcard_jobs
    FOR DELETE USING (auth.uid()::text = user_id);

-- Users can only access their own study progress
CREATE POLICY "Users can view own progress" ON study_progress
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own progress" ON study_progress
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own progress" ON study_progress
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own progress" ON study_progress
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create function to handle user profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, created_at, updated_at)
  VALUES (new.id, now(), now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_profiles IS 'Extended user profiles linked to Supabase auth.users';
COMMENT ON TABLE flashcard_jobs IS 'PDF processing jobs and generated flashcard storage';
COMMENT ON TABLE study_progress IS 'User study progress and spaced repetition data';
COMMENT ON TABLE sessions IS 'Session storage for Express sessions';