-- CRITICAL: Run this in your Supabase SQL Editor to fix authentication issues
-- This script will set up the proper database structure and triggers for user authentication

-- First, ensure we have the correct table structure
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email VARCHAR;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- Update the user profile creation function to include all required fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    is_email_verified,
    is_premium,
    role,
    monthly_uploads,
    monthly_limit,
    monthly_pages_processed,
    last_reset_date,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    CASE 
      WHEN new.email_confirmed_at IS NOT NULL THEN true 
      ELSE false 
    END,
    false,
    'user',
    0,
    3,
    0,
    now(),
    now(),
    now()
  );
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Failed to create user profile for %: %', new.id, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant the function permission to access auth schema
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO postgres;

-- Update RLS policies to allow trigger function to insert profiles
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON user_profiles;
CREATE POLICY "Enable insert for authenticated users only" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

-- Ensure the trigger function has necessary permissions
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Test the trigger by checking if it exists
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists and its definition
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
ORDER BY ordinal_position;