# StudyCards AI - Technical Documentation

## Project Overview

StudyCards AI is a production-ready, full-stack web application that transforms PDF documents into interactive AI-generated flashcards. The platform features intelligent content processing, adaptive learning algorithms, and comprehensive study analytics.

**Live Status**: Production-ready with normalized database architecture and on-demand file generation system.

## System Architecture

### Technology Stack

**Frontend (React + TypeScript)**
- **Framework**: React 18 with TypeScript and Vite build system
- **Routing**: Wouter for client-side navigation
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: Radix UI primitives with Tailwind CSS styling
- **Forms**: React Hook Form with Zod validation
- **Authentication**: Supabase Auth with Google OAuth and email/password

**Backend (Node.js + Express)**
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth with server-side token verification
- **File Processing**: Multer uploads, PyMuPDF text extraction, Tesseract OCR
- **AI Integration**: OpenAI GPT-4o and Anthropic Claude via OpenRouter

**Infrastructure & Services**
- **Database**: PostgreSQL with Drizzle ORM and connection pooling
- **Storage**: Supabase Storage for PDFs and temporary exports
- **Authentication**: Supabase Auth with RLS policies
- **Payments**: Stripe integration for subscription billing
- **Monitoring**: Built-in health monitoring and performance metrics

## Core Features

### 1. PDF Processing Pipeline
```
PDF Upload → Text Extraction → Content Preprocessing → AI Generation → Flashcard Storage
```

- **Multi-format Support**: Digital PDFs via PyMuPDF, scanned documents via Tesseract OCR
- **Intelligent Chunking**: Content preprocessing with relevance scoring and section detection
- **Page Limits**: 50 pages for free users, 200 pages for premium users
- **Storage**: Supabase Storage with automatic cleanup

### 2. AI-Powered Flashcard Generation
- **Configurable Models**: Admin-configurable AI models for different quality tiers
  - Basic Quality: Anthropic Claude 3.5 Sonnet
  - Advanced Quality: OpenAI GPT-4o
- **Focus Areas**: Concepts, definitions, examples, procedures
- **Difficulty Levels**: Beginner, intermediate, advanced
- **Subject Categorization**: Automatic subject detection and tagging

### 3. Normalized Database Architecture
```sql
-- Core tables with proper relationships
user_profiles → flashcard_jobs → flashcards
                              → study_progress
                              → study_sessions
```

- **Individual Flashcard Records**: Each card stored as separate database record
- **Progress Tracking**: Per-card progress with spaced repetition algorithms
- **Session Management**: Complete study session lifecycle tracking
- **Performance Analytics**: Detailed learning statistics and metrics

### 4. Study System
- **Optimized Study Mode**: Batch progress updates with 3-second auto-batching
- **Spaced Repetition**: SM-2 inspired algorithm with exponential intervals
- **Progress States**: New → Learning → Reviewing → Known
- **Real-time Analytics**: Accuracy tracking, streak counting, performance metrics

### 5. Export System
- **On-Demand Generation**: Files generated when requested (1-hour expiry)
- **Multiple Formats**: Anki (.apkg), CSV, JSON, Quizlet-compatible text
- **Temporary Storage**: Automatic cleanup prevents storage bloat
- **Download Management**: Secure URLs with expiration timestamps

## Database Schema

### Primary Tables

**user_profiles**
- User account information and subscription status
- Upload quotas and premium features
- Role-based access control (user, admin, moderator)

**flashcard_jobs**
- PDF processing job records
- File metadata and processing status
- AI configuration and progress tracking

**flashcards** (Normalized)
- Individual flashcard records with proper indexing
- Subject categorization and difficulty levels
- Tags and metadata for advanced filtering

**study_progress**
- Per-card progress tracking with flashcard_id references
- Spaced repetition intervals and difficulty ratings
- Streak counting and review statistics

**study_sessions**
- Complete session lifecycle management
- Duration tracking and accuracy calculations
- Session type categorization and analytics

### Supporting Tables
- `user_preferences`: Study settings and notification preferences
- `support_tickets`: Customer support system
- `admin_settings`: Configurable AI models and system settings
- `subscription_history`: Billing and payment tracking
- `temporary_downloads`: On-demand file generation management

## API Architecture

### Authentication Flow
```typescript
// Supabase Auth integration
POST /api/auth/sync - Sync user profile with Supabase
GET /api/auth/user - Get current user information
```

### File Processing
```typescript
// PDF upload and processing
POST /api/upload - Upload PDF and create processing job
POST /api/reprocess - Reprocess existing PDF with new settings
GET /api/jobs/:id - Get job status and flashcards
```

### Study System
```typescript
// Study session management
GET /api/study-data/:jobId - Get optimized study data
POST /api/study-progress - Batch update study progress
POST /api/study-sessions - Create/complete study sessions
```

### Export System
```typescript
// On-demand file generation
GET /api/export/:jobId/:format - Generate and download export file
```

### Admin Panel
```typescript
// Administrative functions
GET /api/admin/users - User management
GET /api/admin/metrics - System metrics
POST /api/admin/model-config - Configure AI models
```

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# AI Services (OpenRouter)
OPENROUTER_API_KEY=your_openrouter_api_key

# Stripe Payments (Optional)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_publishable_key

# Production Settings
NODE_ENV=production
PORT=5000
```

## Installation & Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Python 3.11+ (for OCR processing)
- Tesseract OCR engine

### Development Setup
```bash
# Clone and install dependencies
git clone <repository>
cd studycards-ai
npm install

# Install Python dependencies
pip install genanki pymupdf pytesseract

# Database setup
npm run db:push

# Start development server
npm run dev
```

### Production Deployment
```bash
# Build application
npm run build

# Start production server
npm run start
```

## Performance Optimizations

### 1. Database Optimizations
- **Connection Pooling**: PostgreSQL connection pooling for scalability
- **Indexing Strategy**: Strategic indexes on frequently queried columns
- **Batch Operations**: Concurrent progress updates with batch processing
- **Query Optimization**: Optimized queries with proper JOIN strategies

### 2. Memory Management
- **Cache Service**: MD5-based content caching with automatic cleanup
- **Monitoring**: Real-time memory usage tracking with health warnings
- **Cleanup Policies**: Automatic temporary file and cache cleanup

### 3. AI Processing
- **Intelligent Chunking**: Optimized text chunking with 8000-character limits
- **Retry Logic**: Exponential backoff with configurable retry policies
- **Provider Failover**: Multi-provider support with automatic failover
- **Rate Limiting**: Built-in rate limiting and quota management

### 4. File System
- **On-Demand Generation**: Eliminates permanent storage of export files
- **Temporary File Management**: 1-hour expiry with automatic cleanup
- **Storage Optimization**: Compressed file formats and efficient encoding

## Security Features

### 1. Authentication & Authorization
- **Supabase Auth**: Industry-standard authentication with OAuth support
- **JWT Tokens**: Secure token-based authentication with expiration
- **Role-Based Access**: Admin, moderator, and user role permissions
- **Email Verification**: Required email verification for new accounts

### 2. Data Protection
- **RLS Policies**: Row-level security on all sensitive tables
- **Input Validation**: Zod schema validation on all API endpoints
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **CORS Configuration**: Proper cross-origin resource sharing settings

### 3. File Security
- **Upload Validation**: File type, size, and content validation
- **Secure Storage**: Supabase Storage with access control
- **Temporary URLs**: Expiring download URLs for sensitive files
- **Virus Scanning**: File content validation and safety checks

## Monitoring & Health

### 1. System Monitoring
```typescript
// Health monitoring endpoints
GET /api/health - System health status
GET /api/admin/system-metrics - Detailed system metrics
```

### 2. Performance Metrics
- **Response Time Tracking**: API endpoint performance monitoring
- **Memory Usage**: Real-time memory consumption tracking
- **Error Rate Monitoring**: Automatic error categorization and alerting
- **Database Performance**: Query execution time and connection health

### 3. User Analytics
- **Study Statistics**: Learning progress and performance analytics
- **Usage Patterns**: Upload frequency and feature utilization
- **Conversion Metrics**: Free-to-premium conversion tracking

## Development Guidelines

### 1. Code Structure
```
├── client/src/          # React frontend
│   ├── components/      # Reusable UI components
│   ├── pages/          # Route components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utility functions
├── server/             # Express backend
│   ├── routes.ts       # API route definitions
│   ├── storage.ts      # Database operations
│   └── services/       # Business logic services
├── shared/             # Shared TypeScript types
└── database_schema.sql # Database schema
```

### 2. Development Practices
- **TypeScript First**: Strict typing throughout the application
- **Component Composition**: Reusable UI components with consistent patterns
- **Error Boundaries**: Comprehensive error handling with user-friendly messages
- **Testing Strategy**: Integration tests for critical user flows
- **Code Reviews**: Mandatory reviews for all production changes

### 3. Database Migrations
```bash
# Schema changes
npm run db:push  # Push schema changes to database

# Never use direct SQL migrations
# Always use Drizzle schema definitions
```

## Troubleshooting Guide

### Common Issues

**1. Authentication Errors**
```bash
# Check Supabase configuration
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
     "$SUPABASE_URL/auth/v1/user"
```

**2. Database Connection Issues**
```bash
# Verify database connectivity
psql $DATABASE_URL -c "SELECT 1;"
```

**3. AI Processing Failures**
```bash
# Check API key configuration
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" \
     "https://openrouter.ai/api/v1/models"
```

**4. File Upload Problems**
- Check file size limits (25MB max)
- Verify Supabase Storage bucket permissions
- Confirm content type validation

### Performance Issues
- Monitor memory usage via `/api/health`
- Check database query performance
- Review cache hit rates and cleanup policies
- Analyze AI processing response times

## Contributing

### Development Workflow
1. Create feature branch from `main`
2. Implement changes with tests
3. Update documentation as needed
4. Submit pull request with detailed description
5. Code review and deployment

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Consistent code formatting
- **Prettier**: Automated code formatting
- **Conventional Commits**: Standardized commit messages

## License

MIT License - See LICENSE file for details.

## Support

For technical issues or questions:
- Create issue in repository
- Contact development team
- Check troubleshooting guide
- Review system health metrics

---

**Version**: 2.0.0  
**Last Updated**: June 22, 2025  
**Production Ready**: ✅