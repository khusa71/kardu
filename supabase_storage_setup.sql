-- Supabase Storage Configuration for Normalized Flashcard System
-- Run this after creating the main database schema

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('studycards-files', 'studycards-files', false, 52428800, ARRAY['application/pdf']),
  ('exports', 'exports', false, 10485760, ARRAY['text/csv', 'application/json', 'text/plain'])
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for studycards-files bucket (PDF uploads)
CREATE POLICY "Users can upload own PDF files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'studycards-files' AND 
    auth.uid()::text = (storage.foldername(name))[1] AND
    (storage.extension(name) = 'pdf' OR storage.extension(name) = 'PDF')
  );

CREATE POLICY "Users can view own PDF files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'studycards-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own PDF files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'studycards-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own PDF files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'studycards-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for exports bucket (temporary downloads)
CREATE POLICY "Users can view own export files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "System can manage export files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'exports' AND
    (
      -- Allow system to create exports
      auth.role() = 'service_role' OR
      -- Allow users to view their own exports
      (auth.uid()::text = (storage.foldername(name))[1] AND current_setting('request.method') = 'GET')
    )
  );

CREATE POLICY "Users can upload export files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "System can cleanup expired exports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'exports' AND
    auth.role() = 'service_role'
  );

-- Function to cleanup expired storage files
CREATE OR REPLACE FUNCTION cleanup_expired_storage_files()
RETURNS INTEGER AS $$
DECLARE
  expired_download RECORD;
  deleted_count INTEGER := 0;
BEGIN
  -- Get expired download records
  FOR expired_download IN 
    SELECT storage_key 
    FROM temporary_downloads 
    WHERE expires_at < NOW()
  LOOP
    -- Delete from storage
    DELETE FROM storage.objects 
    WHERE bucket_id = 'exports' 
    AND name = expired_download.storage_key;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  -- Clean up database records
  DELETE FROM temporary_downloads WHERE expires_at < NOW();
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION cleanup_expired_storage_files() TO authenticated, service_role;

SELECT 'Storage buckets and policies configured successfully!' as staatus;