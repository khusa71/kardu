-- Critical Fix: Create user_profiles table and authentication trigger
-- Run this in your Supabase SQL Editor to fix authentication

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
    page_count INTEGER,
    pages_processed INTEGER,
    pdf_storage_key TEXT,
    pdf_download_url TEXT,
    api_provider TEXT NOT NULL,
    flashcard_count INTEGER NOT NULL,
    subject TEXT,
    difficulty TEXT,
    focus_areas TEXT,
    status TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    current_task TEXT,
    flashcards TEXT,
    anki_storage_key TEXT,
    anki_download_url TEXT,
    csv_storage_key TEXT,
    csv_download_url TEXT,
    json_storage_key TEXT,
    json_download_url TEXT,
    quizlet_storage_key TEXT,
    quizlet_download_url TEXT,
    error_message TEXT,
    processing_time INTEGER,
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
    status TEXT NOT NULL,
    last_reviewed_at TIMESTAMP DEFAULT NOW(),
    next_review_date TIMESTAMP,
    difficulty_rating TEXT,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Create RLS policies for flashcard_jobs
DROP POLICY IF EXISTS "Users can view own jobs" ON flashcard_jobs;
CREATE POLICY "Users can view own jobs" ON flashcard_jobs
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own jobs" ON flashcard_jobs;
CREATE POLICY "Users can insert own jobs" ON flashcard_jobs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own jobs" ON flashcard_jobs;
CREATE POLICY "Users can update own jobs" ON flashcard_jobs
    FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own jobs" ON flashcard_jobs;
CREATE POLICY "Users can delete own jobs" ON flashcard_jobs
    FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for study_progress
DROP POLICY IF EXISTS "Users can view own progress" ON study_progress;
CREATE POLICY "Users can view own progress" ON study_progress
    FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON study_progress;
CREATE POLICY "Users can insert own progress" ON study_progress
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can update own progress" ON study_progress;
CREATE POLICY "Users can update own progress" ON study_progress
    FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can delete own progress" ON study_progress;
CREATE POLICY "Users can delete own progress" ON study_progress
    FOR DELETE USING (auth.uid()::text = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;