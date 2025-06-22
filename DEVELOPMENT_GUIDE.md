# StudyCards AI - Development Guide

## Quick Start for Developers

This guide provides essential information for developers working on the StudyCards AI platform.

## Development Environment Setup

### Prerequisites
```bash
# Required software
Node.js 20+
PostgreSQL 16+
Python 3.11+
Tesseract OCR

# Install system dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install tesseract-ocr python3-pip

# Install Python dependencies
pip install genanki pymupdf pytesseract
```

### Environment Configuration
```bash
# Copy and configure environment variables
cp .env.example .env

# Required variables
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
DATABASE_URL=postgresql://user:password@host:port/database
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Local Development
```bash
# Install dependencies
npm install

# Set up database schema
npm run db:push

# Start development server
npm run dev
```

## Project Structure

### Frontend Architecture (`client/src/`)
```
components/
├── ui/                    # Shadcn UI components
├── navigation-bar.tsx     # Main navigation
├── auth-modal.tsx         # Authentication modal
├── optimized-study-mode.tsx # Study interface
└── flashcard-editor.tsx   # Card editing

pages/
├── dashboard.tsx          # User dashboard
├── upload.tsx             # PDF upload interface
├── study.tsx              # Study session
├── history.tsx            # Upload history
├── admin-panel.tsx        # Admin interface
└── settings.tsx           # User preferences

hooks/
├── useSupabaseAuth.ts     # Authentication logic
├── useRequireAuth.ts      # Route protection
└── use-toast.ts           # Notification system

lib/
├── queryClient.ts         # API request handling
├── supabase.ts            # Supabase client
└── utils.ts               # Utility functions
```

### Backend Architecture (`server/`)
```
Core Files:
├── index.ts              # Express server setup
├── routes.ts             # API route definitions
├── storage.ts            # Database operations
└── db.ts                 # Database connection

Services:
├── ai-service.ts         # AI model integration
├── ocr-service.ts        # PDF text extraction
├── cache-service.ts      # Content caching
├── export-service.ts     # File generation
├── supabase-auth.ts      # Authentication
└── usage-quota-service.ts # Quota management

Python Scripts:
├── pdf-processor.py      # PyMuPDF text extraction
└── anki-generator.py     # Anki deck generation
```

### Shared Types (`shared/`)
```typescript
// Database schema and types
schema.ts - Drizzle ORM schema definitions
- User profiles and authentication
- Flashcard jobs and processing
- Normalized flashcard storage
- Study progress tracking
- Session management
- Support system
```

## Key Development Patterns

### 1. API Route Structure
```typescript
// Standard API route pattern
app.post('/api/endpoint', 
  verifySupabaseToken,           // Authentication
  requireApiKeys,                // Service validation
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Input validation with Zod
      const validatedData = schema.parse(req.body);
      
      // Business logic execution
      const result = await service.processData(validatedData);
      
      // Response with proper typing
      res.json(result);
    } catch (error) {
      // Standardized error handling
      handleApiError(res, error);
    }
  }
);
```

### 2. Frontend Data Fetching
```typescript
// React Query pattern
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/endpoint', parameter],
  enabled: !!parameter,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Mutations with cache invalidation
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/related'] });
  },
});
```

### 3. Database Operations
```typescript
// Storage interface pattern
export interface IStorage {
  getEntity(id: string): Promise<Entity | undefined>;
  createEntity(data: InsertEntity): Promise<Entity>;
  updateEntity(id: string, updates: Partial<Entity>): Promise<Entity>;
  deleteEntity(id: string): Promise<boolean>;
}

// Implementation with proper error handling
async createEntity(data: InsertEntity): Promise<Entity> {
  try {
    const [entity] = await db
      .insert(entityTable)
      .values(data)
      .returning();
    return entity;
  } catch (error) {
    throw new DatabaseError('Failed to create entity', error);
  }
}
```

## AI Integration Patterns

### Model Configuration
```typescript
// Admin-configurable AI models
const modelMap = {
  basic: 'anthropic/claude-3.5-sonnet',    // Free + Premium
  advanced: 'openai/gpt-4o'                // Premium only
};

// Runtime model selection
function selectModel(userTier: string, quality: string): string {
  if (userTier === 'free' || quality === 'basic') {
    return modelMap.basic;
  }
  return userTier === 'premium' ? modelMap.advanced : modelMap.basic;
}
```

### Content Processing
```typescript
// Chunking strategy for large documents
function intelligentChunk(text: string, maxSize: number): ContentChunk[] {
  const sections = splitBySections(text);
  const chunks: ContentChunk[] = [];
  
  for (const section of sections) {
    if (section.length <= maxSize) {
      chunks.push(createChunk(section));
    } else {
      chunks.push(...splitLargeSection(section, maxSize));
    }
  }
  
  return prioritizeChunks(chunks);
}
```

## Database Schema Patterns

### Normalized Flashcard Storage
```sql
-- Individual flashcard records
CREATE TABLE flashcards (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES flashcard_jobs(id),
    card_index INTEGER NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    subject TEXT,
    difficulty TEXT,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Progress tracking per card
CREATE TABLE study_progress (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id),
    flashcard_id INTEGER REFERENCES flashcards(id),
    status TEXT NOT NULL, -- 'new', 'learning', 'reviewing', 'known'
    correct_streak INTEGER DEFAULT 0,
    next_review_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Relationship Patterns
```typescript
// Proper foreign key relationships
user_profiles (1) → (many) flashcard_jobs
flashcard_jobs (1) → (many) flashcards
flashcards (1) → (many) study_progress
user_profiles (1) → (many) study_sessions
```

## Authentication & Security

### Token Validation
```typescript
// Supabase token verification
export const verifySupabaseToken = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
};
```

### Role-Based Access Control
```typescript
// Admin route protection
export const requireAdminRole = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userProfile = await storage.getUserProfile(req.user!.id);
  
  if (userProfile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};
```

## Performance Optimization

### Caching Strategy
```typescript
// Multi-layer caching
class CacheService {
  private memoryCache = new Map<string, CachedContent>();
  private diskCacheDir = './cache';
  
  async getCached(key: string): Promise<any | null> {
    // Layer 1: Memory (fastest)
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key);
    }
    
    // Layer 2: Disk (fast)
    const diskResult = await this.loadFromDisk(key);
    if (diskResult) {
      this.memoryCache.set(key, diskResult);
      return diskResult;
    }
    
    return null;
  }
}
```

### Database Optimization
```typescript
// Batch operations for better performance
async batchUpdateStudyProgress(
  progressList: InsertStudyProgress[]
): Promise<StudyProgress[]> {
  const batchSize = 20;
  const results: StudyProgress[] = [];
  
  for (let i = 0; i < progressList.length; i += batchSize) {
    const batch = progressList.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(progress => this.upsertStudyProgress(progress))
    );
    results.push(...batchResults);
  }
  
  return results;
}
```

## Testing Patterns

### API Testing
```typescript
// Integration test example
describe('PDF Upload Flow', () => {
  it('should process PDF and create flashcards', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${validToken}`)
      .attach('file', './test-files/sample.pdf')
      .field('subject', 'Mathematics')
      .field('difficulty', 'intermediate');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('jobId');
    
    // Wait for processing completion
    const job = await waitForJobCompletion(response.body.jobId);
    expect(job.status).toBe('completed');
    expect(job.flashcardCount).toBeGreaterThan(0);
  });
});
```

### Component Testing
```typescript
// React component test
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Upload Component', () => {
  it('should show error for invalid file type', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Upload />
      </QueryClientProvider>
    );
    
    const fileInput = screen.getByLabelText(/upload/i);
    const invalidFile = new File(['content'], 'test.txt', { 
      type: 'text/plain' 
    });
    
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    
    expect(await screen.findByText(/only pdf files/i)).toBeInTheDocument();
  });
});
```

## Deployment & Production

### Build Process
```bash
# Production build
npm run build

# Outputs:
# - dist/public/ (frontend static files)
# - dist/index.js (backend server bundle)
```

### Environment-Specific Configuration
```typescript
// Production optimizations
if (process.env.NODE_ENV === 'production') {
  // Enable production optimizations
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: productionCSP
    }
  }));
  
  // Disable development features
  console.log = () => {}; // Disable debug logging
}
```

### Health Monitoring
```typescript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = await healthMonitor.getHealthStatus();
  
  res.status(health.status === 'healthy' ? 200 : 503).json({
    status: health.status,
    timestamp: health.timestamp,
    services: health.services,
    uptime: process.uptime()
  });
});
```

## Common Development Tasks

### Adding New API Endpoint
1. Define route in `server/routes.ts`
2. Add authentication middleware
3. Implement business logic in service layer
4. Add database operations to storage interface
5. Create frontend API call in query client
6. Add TypeScript types to shared schema

### Adding New UI Component
1. Create component in `client/src/components/`
2. Use Shadcn UI primitives for consistency
3. Implement proper TypeScript typing
4. Add to storybook (if applicable)
5. Write component tests

### Database Schema Changes
1. Update `shared/schema.ts` with new table/columns
2. Run `npm run db:push` to apply changes
3. Update storage interface methods
4. Update API endpoints to handle new fields
5. Update frontend forms and displays

### Adding New Study Features
1. Update flashcard schema if needed
2. Implement progress tracking logic
3. Update study mode component
4. Add analytics tracking
5. Test with real user data

## Troubleshooting Common Issues

### Authentication Problems
```bash
# Check Supabase configuration
curl -H "Authorization: Bearer $TOKEN" "$SUPABASE_URL/auth/v1/user"

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Database Connection Issues
```bash
# Test database connectivity
psql $DATABASE_URL -c "SELECT version();"

# Check connection pool status
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### AI Processing Failures
```bash
# Verify API key
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     "https://openrouter.ai/api/v1/models"

# Check processing logs
tail -f logs/ai-processing.log
```

### Performance Issues
```bash
# Monitor memory usage
curl localhost:5000/api/health

# Check database query performance
EXPLAIN ANALYZE SELECT * FROM flashcards WHERE job_id = 123;
```

## Best Practices

### Code Quality
- Use TypeScript strict mode
- Implement proper error boundaries
- Write comprehensive tests
- Follow consistent naming conventions
- Document complex business logic

### Security
- Always validate user input
- Use parameterized database queries
- Implement proper authentication
- Follow principle of least privilege
- Regular security audits

### Performance
- Implement proper caching strategies
- Use database indexes effectively
- Optimize bundle sizes
- Monitor real-time metrics
- Profile critical code paths

### Maintainability
- Keep components small and focused
- Use consistent patterns across codebase
- Document architectural decisions
- Implement proper logging
- Regular code reviews

---

**Document Version**: 1.0  
**Target Audience**: Developers working on StudyCards AI  
**Last Updated**: June 22, 2025