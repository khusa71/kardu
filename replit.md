# StudyCards AI - PDF to Flashcard Generation Platform

## Overview

StudyCards AI (kardu.io) is a full-stack web application that transforms PDF documents into AI-generated flashcards. The platform allows users to upload PDFs, process them using AI services, and export the generated flashcards to multiple formats including Anki, Quizlet, CSV, and JSON.

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
- Firebase Authentication with Google OAuth and email/password
- Server-side token verification using Firebase Admin SDK
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
- Firebase Authentication for user management
- Stripe for subscription billing and payment processing

### Storage & Database
- Neon PostgreSQL for persistent data storage
- Replit Object Storage for file and export storage

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

## Changelog
- June 20, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.