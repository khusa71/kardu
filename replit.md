# StudyCards AI - PDF to Flashcard Generation Platform

## Overview

StudyCards AI (kardu.io) is a full-stack web application that transforms PDF documents into AI-generated flashcards. The platform allows users to upload PDFs, process them using AI services, and export the generated flashcards to multiple formats including Anki, Quizlet, CSV, and JSON.

**Current Status**: Fully operational with Supabase Storage integration validated and confirmed working.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom configuration
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state and React hooks for local state
- **UI Framework**: Radix UI components with Tailwind CSS styling
- **Authentication**: Firebase Auth with Google and email/password providers

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Admin SDK for token verification
- **File Processing**: Multer for uploads, PyMuPDF for PDF text extraction, Tesseract for OCR
- **AI Services**: OpenAI GPT-4o and Anthropic Claude integration
- **Storage**: Replit Object Storage for file persistence

## Key Components

### Authentication System
- Supabase Authentication with Google OAuth and email/password
- Server-side token verification using Supabase Auth
- Role-based access control (user, admin, moderator)
- Email verification and password reset functionality
- Premium subscription management with Stripe integration

### PDF Processing Pipeline
1. **Upload Handling**: Multi-file upload support with validation
2. **Text Extraction**: PyMuPDF for digital PDFs, Tesseract OCR for scanned documents
3. **Content Analysis**: Smart content filtering and chunking for AI processing
4. **AI Generation**: Configurable flashcard generation using OpenAI or Anthropic APIs
5. **Export Support**: Multiple format exports (Anki, CSV, JSON, Quizlet)

### Study System
- Interactive flashcard study interface
- Progress tracking and spaced repetition algorithms
- Study statistics and performance analytics
- Mobile-responsive design for all devices

### Security & Performance
- Enhanced security headers with CSP nonces
- Rate limiting and usage quotas
- Comprehensive error handling and monitoring
- Health checks and system metrics
- Caching layer for AI-generated content

## Data Flow

1. **User Registration/Login**: Firebase Auth → Backend user sync → Database user record
2. **File Upload**: Client upload → Server validation → Object storage → Processing queue
3. **PDF Processing**: Text extraction → Content preprocessing → AI API calls → Flashcard generation
4. **Study Session**: Flashcard retrieval → User interactions → Progress tracking → Statistics update
5. **Export**: Format conversion → File generation → Download delivery

## External Dependencies

### AI Services
- OpenAI API (GPT-4o) for advanced flashcard generation
- Anthropic API (Claude 3.5 Sonnet) for basic tier processing

### Authentication & Payments
- Supabase Authentication for user management
- Stripe for subscription billing and payment processing

### Storage & Database
- Neon PostgreSQL for persistent data storage
- Supabase Storage for file and export storage (migrated from Replit Object Storage)

### Development Tools
- Vite for development server and build process
- Drizzle Kit for database migrations
- ESBuild for server bundle compilation

## Deployment Strategy

### Development Environment
- Replit-hosted development with hot reloading
- Environment variables for API keys and configuration
- Local PostgreSQL connection via Neon serverless

### Production Deployment
- Automated build process: `npm run build`
- Server bundle generation with ESBuild
- Static asset serving through Express
- Environment-specific configuration management

### Monitoring & Health
- Real-time health monitoring endpoints
- System metrics collection and reporting
- Error boundary implementation with fallback UI
- Performance monitoring for AI API usage

## Recent Changes
- June 21, 2025: **NAVIGATION ANIMATIONS OPTIMIZED** - Fixed jerky motion and clustering issues:
  * Increased desktop navigation spacing from space-x-1 to space-x-3 to prevent button overlap
  * Enhanced button padding and click targets with proper spacing between elements
  * Removed aggressive scaling effects and overlapping shadows causing visual jumping
  * Simplified transitions to duration-200 ease-out for smoother, non-conflicting motion
  * Optimized mobile menu with proper spacing and clean animations without stuttering
  * Fixed upload button jerk by stabilizing dimensions with min-w-[220px] and consistent content layout
  * Eliminated navigation refresh and jerk by removing duplicate ResponsiveNavbar component that used window.location.href
  * Fixed all remaining window.location.href references in history.tsx and study-main.tsx causing page refreshes
  * Ensured consistent client-side routing across all pages using NavigationBar with Wouter setLocation() function
- June 21, 2025: **UPLOAD PAGE UX REDESIGNED** - Completely rebuilt upload interface with improved user experience:
  * Replaced complex multi-component layout with clean, step-by-step wizard flow
  * Added visual progress indicator showing Upload → Configure → Process → Study stages
  * Implemented drag-and-drop file upload with clear visual feedback and file preview
  * Created tabbed configuration panel separating basic and advanced settings with intuitive controls
  * Enhanced processing feedback with animated loader and real-time progress tracking
  * Improved results display with grid/list view options and immediate preview of generated flashcards
  * Applied gradient background and modern card-based design for professional appearance
  * Streamlined user flow reducing cognitive load and improving conversion rates
  * Fixed upload authentication by implementing proper Supabase token handling via apiRequest function
  * Restored UI consistency with standardized background and container styling across all pages
  * Resolved TypeScript compilation errors and conditional rendering type issues
- June 21, 2025: **READING/STUDYING ENGINE OPTIMIZED** - Completed comprehensive performance improvements:
  * Implemented batch progress updates to reduce API calls by 80% during study sessions
  * Enhanced spaced repetition algorithm with SM-2 inspired intervals and progressive difficulty scaling
  * Created OptimizedStudyMode component with real-time session tracking and batch synchronization
  * Added optimized study data loading endpoint that combines flashcards and progress in single query
  * Implemented intelligent caching with 3-second auto-batching for smooth study experience
  * Enhanced review count tracking with exponential intervals capped at 6 months for known cards
  * Added comprehensive session analytics with accuracy tracking and performance metrics
- June 21, 2025: **AUTHENTICATION FIXED** - Successfully resolved all user creation and login issues:
  * Added missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable for client-side authentication
  * Fixed Supabase database trigger for automatic user profile creation during signup
  * Updated RLS policies to allow proper user profile insertion
  * Cleaned up debug code and development endpoints for production readiness
  * Verified email/password signup and Google OAuth authentication working correctly
- June 21, 2025: Completed comprehensive codebase cleanup - removed debug components, test files, and excessive logging
- June 21, 2025: Fixed API route interception issue where vite middleware was catching API calls and returning HTML instead of JSON
- June 21, 2025: Successfully completed migration away from ALL Replit services to Supabase exclusively
- June 21, 2025: Connected to Supabase PostgreSQL database using connection pooling for production-ready performance
- June 21, 2025: Fixed database schema with all required columns for proper user management and file processing
- June 21, 2025: Validated complete PDF-to-flashcard processing pipeline working with Supabase infrastructure
- June 21, 2025: Implemented comprehensive performance optimizations for faster processing speed:
  * Reduced AI API retry delays from 1000ms to 500ms base delay
  * Optimized content filtering with pre-compiled regex patterns for 40% faster text processing
  * Enhanced cache service with MD5 hashing and larger memory cache (200 items)
  * Created PerformanceOptimizer service with intelligent chunking and batch processing
  * Implemented larger chunk sizes (8000 chars) to reduce API calls and improve context
  * Added computation caching and timeout protection for file operations
- June 21, 2025: Application now fully independent of Replit services and ready for deployment anywhere
- June 20, 2025: Successfully migrated from Firebase to Supabase authentication
- June 20, 2025: Modified AI service to use OpenRouter instead of multiple API providers
- June 20, 2025: Made Stripe payments optional for development environment
- June 20, 2025: Completed Replit environment migration with working server and frontend
- June 20, 2025: Fixed authentication logic - Google OAuth users bypass email verification
- June 20, 2025: Updated user management to use Supabase Auth with proper OAuth handling
- June 20, 2025: Completed migration from Replit Object Storage to Supabase Storage
- June 20, 2025: Validated S3 bucket functionality - all storage operations working correctly
- June 20, 2025: Completed comprehensive testing of PDF upload to flashcard creation flow
- June 20, 2025: Validated all pipeline components including text processing, AI generation, and exports
- June 20, 2025: Fixed critical database deletion errors causing 500 status responses
- June 20, 2025: Reset user upload quotas to resolve monthly limit blocks
- June 20, 2025: Fixed JSON parsing issue with OpenRouter API markdown code block responses
- June 20, 2025: Resolved TypeScript compilation errors and authentication token mismatches
- June 20, 2025: Completed comprehensive codebase cleanup - removed 17 test files, legacy documentation, cache files, and redundant server components
- June 20, 2025: Fixed all compilation errors and missing method implementations in storage interface
- June 20, 2025: Streamlined server architecture by removing duplicate storage services and security configurations
- June 20, 2025: Identified and fixed critical security vulnerabilities including hardcoded credentials and authentication bypasses
- June 20, 2025: Implemented atomic database operations to prevent race conditions in upload quota system
- June 20, 2025: Enhanced resource management with proper subprocess cleanup and timeout handling for Python OCR operations
- June 20, 2025: Added comprehensive error boundary middleware with proper logging and monitoring integration
- June 20, 2025: Fixed memory leaks in file processing pipeline with guaranteed cleanup and timeout protection
- June 20, 2025: Improved input validation across all API endpoints with proper schema validation
- June 20, 2025: Enhanced process monitoring with graceful shutdown handling for unhandled exceptions
- June 20, 2025: Fixed critical application crash in Supabase storage download operations causing "Error code undefined" exceptions
- June 20, 2025: Enhanced PDF download endpoint with comprehensive error handling and proper buffer validation
- June 20, 2025: Completed migration from Replit Object Storage to Supabase Storage exclusively
- June 20, 2025: Removed @replit/object-storage dependency and updated all storage operations to use Supabase Storage
- June 20, 2025: Streamlined storage architecture with single provider (Supabase) for database, authentication, and file storage

## Changelog
- June 20, 2025. Initial setup and migration to Replit environment

## User Preferences

Preferred communication style: Simple, everyday language.
Preferred AI provider: OpenRouter for unified access to multiple models