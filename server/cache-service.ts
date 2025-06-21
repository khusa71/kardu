import crypto from 'crypto';
import { writeFile, readFile, access } from 'fs/promises';
import path from 'path';
import { FlashcardPair } from '../shared/schema';

export interface CachedContent {
  hash: string;
  text: string;
  subject: string;
  flashcards: FlashcardPair[];
  timestamp: number;
  difficulty: string;
  focusAreas: string;
}

export class CacheService {
  private cacheDir: string;
  private memoryCache: Map<string, CachedContent>;

  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.memoryCache = new Map();
    this.ensureCacheDir();
  }

  private async ensureCacheDir() {
    try {
      await access(this.cacheDir);
    } catch {
      // Cache directory doesn't exist, create it
      const { mkdir } = await import('fs/promises');
      await mkdir(this.cacheDir, { recursive: true });
    }
  }

  // Create optimized content hash for faster caching
  generateContentHash(text: string, subject: string, difficulty: string, focusAreas: string): string {
    // Use faster hash for better performance
    const content = `${text.slice(0, 1000)}|${subject}|${difficulty}|${focusAreas}`;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  // Check if content exists in cache
  async getCachedFlashcards(hash: string): Promise<FlashcardPair[] | null> {
    try {
      // Check memory cache first
      if (this.memoryCache.has(hash)) {
        const cached = this.memoryCache.get(hash)!;
        // Check if cache is still valid (24 hours)
        if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
          console.log('Cache hit (memory):', hash.substring(0, 8));
          return cached.flashcards;
        } else {
          this.memoryCache.delete(hash);
        }
      }

      // Check file cache
      const cacheFile = path.join(this.cacheDir, `${hash}.json`);
      const cacheData = await readFile(cacheFile, 'utf-8');
      const cached: CachedContent = JSON.parse(cacheData);
      
      // Check if cache is still valid (7 days for file cache)
      if (Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        console.log('Cache hit (file):', hash.substring(0, 8));
        // Store in memory for faster access
        this.memoryCache.set(hash, cached);
        return cached.flashcards;
      }
    } catch (error) {
      // Cache miss or invalid cache
      return null;
    }
    
    return null;
  }

  // Store flashcards in cache
  async cacheFlashcards(
    hash: string, 
    text: string, 
    subject: string, 
    flashcards: FlashcardPair[], 
    difficulty: string, 
    focusAreas: string
  ): Promise<void> {
    const cached: CachedContent = {
      hash,
      text: text.substring(0, 1000), // Store only first 1000 chars for reference
      subject,
      flashcards,
      timestamp: Date.now(),
      difficulty,
      focusAreas
    };

    // Store in memory cache
    this.memoryCache.set(hash, cached);

    // Store in file cache
    try {
      const cacheFile = path.join(this.cacheDir, `${hash}.json`);
      await writeFile(cacheFile, JSON.stringify(cached, null, 2));
      console.log('Cached flashcards:', hash.substring(0, 8));
    } catch (error) {
      console.error('Failed to write cache file:', error);
    }
  }

  // Get cache statistics
  getCacheStats(): { memorySize: number; estimatedFileCount: number } {
    return {
      memorySize: this.memoryCache.size,
      estimatedFileCount: 0 // Would need to scan directory
    };
  }

  // Clear expired cache entries
  async cleanupCache(): Promise<void> {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    // Clean memory cache
    const entriesToDelete: string[] = [];
    this.memoryCache.forEach((cached, hash) => {
      if (now - cached.timestamp > maxAge) {
        entriesToDelete.push(hash);
      }
    });
    entriesToDelete.forEach(hash => this.memoryCache.delete(hash));

    // File cache cleanup would require scanning directory
    console.log('Cache cleanup completed');
  }
}

export const cacheService = new CacheService();