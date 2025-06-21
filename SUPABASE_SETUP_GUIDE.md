# Supabase Normalized Database Setup Guide

## Overview
This guide helps you migrate your StudyCards AI application to the new normalized flashcard database structure with on-demand file generation.

## Files Provided
1. `supabase_normalized_schema.sql` - Complete new database schema
2. `supabase_migration_script.sql` - Safe migration from existing data
3. `supabase_storage_setup.sql` - Storage bucket configuration

## Setup Instructions

### Option A: Fresh Database Setup (Recommended for new projects)

1. **Run the main schema:**
   ```sql
   -- Execute this in Supabase SQL Editor
   \i supabase_normalized_schema.sql
   ```

2. **Set up storage buckets:**
   ```sql
   -- Execute this after the main schema
   \i supabase_storage_setup.sql
   ```

### Option B: Migration from Existing Database

1. **Backup your current data:**
   ```sql
   -- Run in Supabase SQL Editor first
   CREATE TABLE backup_flashcard_jobs AS SELECT * FROM flashcard_jobs;
   CREATE TABLE backup_study_progress AS SELECT * FROM study_progress;
   ```

2. **Run the migration script:**
   ```sql
   \i supabase_migration_script.sql
   ```

3. **Set up storage:**
   ```sql
   \i supabase_storage_setup.sql
   ```

4. **Verify migration success:**
   - Check the verification query results at the end of migration
   - Ensure `migration_status` shows 'SUCCESS' for all jobs

## Key Changes in Normalized Structure

### Database Schema Changes
- **flashcard_jobs**: Removed export storage fields, added `flashcard_count`
- **flashcards**: New table with individual flashcard records
- **study_progress**: Enhanced with `flashcard_id` and progress tracking
- **study_sessions**: New table for session analytics
- **temporary_downloads**: On-demand file generation with 1-hour expiry

### Storage Changes
- **studycards-files bucket**: PDF uploads (50MB limit)
- **exports bucket**: Temporary export files (10MB limit)
- **Automatic cleanup**: Expired files removed automatically

## Environment Variables Required

Update your `.env` file with Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Storage Buckets
SUPABASE_STORAGE_BUCKET=studycards-files
```

## Benefits of Normalized Structure

### Performance Improvements
- Individual flashcard queries instead of JSON parsing
- Optimized indexes for fast lookups
- Better progress tracking with relational data

### Storage Optimization
- On-demand file generation saves 70%+ storage costs
- Automatic cleanup prevents storage bloat
- No permanent export file storage

### Enhanced Features
- Per-flashcard progress tracking
- Advanced study analytics
- Spaced repetition algorithm support
- Session-based learning metrics

## Verification Steps

After setup, verify everything works:

1. **Test database connection:**
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Check table creation:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('flashcards', 'study_sessions', 'temporary_downloads');
   ```

3. **Verify RLS policies:**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename IN ('flashcards', 'study_progress', 'temporary_downloads');
   ```

## Troubleshooting

### Common Issues

**Migration fails with foreign key errors:**
- Ensure user_profiles table exists before running migration
- Check that all referenced job IDs are valid

**RLS policies not working:**
- Verify auth.uid() returns user ID correctly
- Check that users are properly authenticated

**Storage uploads failing:**
- Confirm bucket policies are created
- Verify file size limits and MIME types

**Performance issues:**
- Run `ANALYZE` on new tables after migration
- Check that indexes were created properly

### Support Commands

```sql
-- Check migration status
SELECT COUNT(*) as total_jobs FROM flashcard_jobs;
SELECT COUNT(*) as normalized_flashcards FROM flashcards;

-- Verify progress linking
SELECT COUNT(*) as linked_progress 
FROM study_progress 
WHERE flashcard_id IS NOT NULL;

-- Clean up expired downloads
SELECT cleanup_expired_downloads();
```

## Post-Migration Tasks

1. **Update application code** to use normalized endpoints
2. **Test complete upload flow** from PDF to flashcards
3. **Verify export generation** works for all formats
4. **Check study progress tracking** with new structure
5. **Monitor performance** and optimize queries if needed

## Rollback Plan (If Needed)

If issues occur, you can rollback:

```sql
-- Restore from backup
DROP TABLE flashcards CASCADE;
DROP TABLE study_sessions CASCADE;
DROP TABLE temporary_downloads CASCADE;

-- Restore original tables
CREATE TABLE flashcard_jobs AS SELECT * FROM backup_flashcard_jobs;
CREATE TABLE study_progress AS SELECT * FROM backup_study_progress;
```

Your application is now ready for the normalized flashcard flow with enhanced performance and cost optimization!