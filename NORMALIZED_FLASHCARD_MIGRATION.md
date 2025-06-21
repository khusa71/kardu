# Normalized Flashcard Database Migration

## Problem Statement
The current study mechanism stores flashcards as JSON in the `flashcard_jobs` table, which creates:
- Scalability issues for large datasets
- Difficulty generating multiple output formats
- Poor progress tracking capabilities
- Storage redundancy and inefficiency

## Solution: Normalized Database Schema

### New Database Structure

#### 1. Flashcards Table (NEW)
```sql
CREATE TABLE flashcards (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL REFERENCES flashcard_jobs(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES user_profiles(id),
  card_index INTEGER NOT NULL,     -- Position in original set
  front TEXT NOT NULL,            -- Question/prompt
  back TEXT NOT NULL,             -- Answer/explanation
  subject TEXT,                   -- Subject category
  difficulty TEXT,                -- 'beginner' | 'intermediate' | 'advanced'
  tags TEXT[],                    -- Array of tags for categorization
  confidence NUMERIC(3,2),        -- AI confidence score (0.00-1.00)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. Updated Study Progress Table
```sql
-- Changed from cardIndex reference to flashcardId reference
ALTER TABLE study_progress 
  DROP COLUMN card_index,
  ADD COLUMN flashcard_id INTEGER NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  ADD COLUMN correct_streak INTEGER DEFAULT 0,
  ADD COLUMN total_reviews INTEGER DEFAULT 0,
  ADD COLUMN correct_reviews INTEGER DEFAULT 0;
```

#### 3. Updated Flashcard Jobs Table
```sql
-- Remove JSON flashcards field (migrated to normalized table)
ALTER TABLE flashcard_jobs DROP COLUMN flashcards;
```

### Migration Strategy

#### Phase 1: Schema Addition ✅ COMPLETED
- Added new `flashcards` table with proper indexes
- Updated `study_progress` to reference `flashcard_id`
- Added enhanced progress tracking fields

#### Phase 2: Data Migration (IN PROGRESS)
- Created migration helper to convert existing JSON flashcards
- Preserve all existing flashcard data during transition
- Update all references from JSON to normalized structure

#### Phase 3: Code Updates (IN PROGRESS)
- Updated storage layer with normalized CRUD operations
- Modified AI service to create normalized flashcard records
- Updated study components to use new structure

#### Phase 4: Legacy Cleanup (PENDING)
- Remove JSON flashcards field from schema
- Clean up legacy code references
- Complete migration testing

### Benefits of Normalized Structure

#### 1. Enhanced Study Tracking
- Individual progress per flashcard
- Detailed statistics (correct streak, total reviews)
- Spaced repetition algorithms
- Performance analytics

#### 2. Improved Scalability
- Efficient queries for large datasets
- Better memory usage
- Faster processing times
- Database optimization opportunities

#### 3. Multiple Export Formats
- Dynamic format generation from normalized data
- Consistent data across all export types
- Real-time progress inclusion in exports
- Custom export configurations

#### 4. Advanced Features
- Tag-based filtering and search
- Difficulty-based study modes
- Confidence-weighted algorithms
- Cross-job analytics

### Implementation Status

#### ✅ Completed
- Database schema design
- Flashcards table creation
- Study progress table updates
- Storage interface design
- Migration helper creation

#### 🔄 In Progress
- Storage layer implementation
- Data migration execution
- Code compilation fixes
- API endpoint updates

#### ⏳ Pending
- Frontend component updates
- Study mode integration
- Export service updates
- Legacy cleanup

### Next Steps

1. **Complete Storage Layer**: Fix remaining compilation errors
2. **Execute Migration**: Run data migration for existing jobs
3. **Update Processing Pipeline**: Modify AI service to create normalized records
4. **Test Study System**: Verify progress tracking works correctly
5. **Update Frontend**: Modify components to use new structure

### Risk Mitigation

- **Data Loss Prevention**: Migration creates normalized records before removing JSON
- **Rollback Capability**: Migration helper includes rollback function
- **Incremental Updates**: Changes can be deployed progressively
- **Backup Strategy**: Full database backup before migration execution

This normalized structure will provide a robust foundation for scalable study functionality and enhanced user progress tracking.