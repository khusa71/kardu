import {
  userProfiles,
  flashcardJobs,
  flashcards,
  studyProgress,
  studySessions,
  type UserProfile,
  type UpsertUserProfile,
  type FlashcardJob,
  type InsertFlashcardJob,
  type Flashcard,
  type InsertFlashcard,
  type StudyProgress,
  type InsertStudyProgress,
  type StudySession,
  type InsertStudySession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, isNull } from "drizzle-orm";

export interface IStorage {
  // User profile operations for Supabase Auth
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  upsertUserProfile(user: UpsertUserProfile): Promise<UserProfile>;
  incrementUserUploads(userId: string): Promise<void>;
  incrementUserPagesProcessed(userId: string, pagesCount: number): Promise<void>;
  checkUploadLimit(userId: string): Promise<{ canUpload: boolean; uploadsRemaining: number }>;
  upgradeToPremium(userId: string): Promise<void>;
  resetMonthlyUploads(userId: string): Promise<void>;
  
  // Stripe operations
  updateStripeCustomerId(userId: string, customerId: string): Promise<UserProfile>;
  updateUserSubscription(userId: string, subscriptionData: {
    subscriptionId: string;
    status: string;
    periodEnd: Date;
  }): Promise<UserProfile>;
  cancelUserSubscription(userId: string): Promise<UserProfile>;
  
  // Flashcard job operations
  createFlashcardJob(job: InsertFlashcardJob): Promise<FlashcardJob>;
  getFlashcardJob(id: number): Promise<FlashcardJob | undefined>;
  updateFlashcardJob(id: number, updates: Partial<FlashcardJob>): Promise<FlashcardJob | undefined>;
  updateJobFilename(id: number, filename: string): Promise<void>;
  deleteFlashcardJob(id: number): Promise<boolean>;
  getUserJobs(userId: string): Promise<FlashcardJob[]>;
  
  // Normalized flashcard operations
  createFlashcards(flashcardList: InsertFlashcard[]): Promise<Flashcard[]>;
  getFlashcards(jobId: number): Promise<Flashcard[]>;
  getFlashcard(id: number): Promise<Flashcard | undefined>;
  updateFlashcard(id: number, updates: Partial<Flashcard>): Promise<Flashcard | undefined>;
  deleteFlashcards(jobId: number): Promise<boolean>;
  
  // Study progress operations
  getStudyProgress(userId: string, jobId: number): Promise<StudyProgress[]>;
  updateStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  upsertStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  batchUpdateStudyProgress(progressList: InsertStudyProgress[]): Promise<StudyProgress[]>;
  getStudyStats(userId: string, jobId: number): Promise<{ total: number; known: number; reviewing: number }>;
  getOptimizedFlashcards(jobId: number, userId: string): Promise<{ flashcards: any[]; progress: StudyProgress[] }>;
  
  // Study session operations
  createStudySession(session: InsertStudySession): Promise<StudySession>;
  updateStudySession(sessionId: number, updates: Partial<StudySession>): Promise<StudySession>;
  completeStudySession(sessionId: number, stats: { cardsStudied: number; accuracy: number }): Promise<StudySession>;
  getUserStudySessions(userId: string, jobId?: number): Promise<StudySession[]>;
}

export class DatabaseStorage implements IStorage {
  // User profile operations for Supabase Auth
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    return profile || undefined;
  }

  async upsertUserProfile(userData: UpsertUserProfile): Promise<UserProfile> {
    try {
      console.log('Attempting to upsert user profile:', userData);
      
      // Use columns that exist in actual database schema
      const dbUserData = {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        avatarUrl: userData.avatarUrl,
        isPremium: userData.isPremium || false,
        subscriptionStatus: userData.subscriptionStatus,
        subscriptionTier: userData.subscriptionTier || "free",
        uploadsThisMonth: userData.uploadsThisMonth || 0,
        maxMonthlyUploads: userData.maxMonthlyUploads || (userData.isPremium ? 100 : 3),
        createdAt: userData.createdAt || new Date(),
        updatedAt: userData.updatedAt || new Date(),
      };

      const [profile] = await db
        .insert(userProfiles)
        .values(dbUserData)
        .onConflictDoUpdate({
          target: userProfiles.id,
          set: {
            email: dbUserData.email,
            isPremium: dbUserData.isPremium,
            maxMonthlyUploads: dbUserData.maxMonthlyUploads,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      console.log('User profile upserted successfully:', profile);
      return profile;
    } catch (error: any) {
      console.error("Database error in upsertUserProfile:", error);
      console.error("Attempted data:", userData);
      throw new Error(`Database error saving user profile: ${error?.message || 'Unknown error'}`);
    }
  }

  async incrementUserUploads(userId: string): Promise<void> {
    const now = new Date();
    try {
      await db
        .update(userProfiles)
        .set({
          updatedAt: now,
        })
        .where(eq(userProfiles.id, userId));
    } catch (error) {
      console.error(`Failed to update user ${userId}:`, error);
      throw new Error('User update failed');
    }
  }

  async incrementUserPagesProcessed(userId: string, pagesCount: number): Promise<void> {
    const now = new Date();
    try {
      await db
        .update(userProfiles)
        .set({
          updatedAt: now,
        })
        .where(eq(userProfiles.id, userId));
      console.log(`Updated user ${userId} timestamp for ${pagesCount} pages processed`);
    } catch (error: any) {
      console.error(`Failed to update user ${userId}:`, error);
      throw new Error('User update failed');
    }
  }

  async checkUploadLimit(userId: string): Promise<{ canUpload: boolean; uploadsRemaining: number }> {
    try {
      const user = await this.getUserProfile(userId);
      if (!user) {
        return { canUpload: false, uploadsRemaining: 0 };
      }

      // Simplified - allow uploads for authenticated users
      const monthlyLimit = user.isPremium ? 100 : 3;
      return { canUpload: true, uploadsRemaining: monthlyLimit };
    } catch (error) {
      console.error(`Failed to check upload limit for user ${userId}:`, error);
      throw new Error('Upload limit check failed');
    }
  }

  async upgradeToPremium(userId: string): Promise<void> {
    const now = new Date();
    console.log('Upgrading user to premium with timestamp:', now.toISOString());
    
    await db
      .update(userProfiles)
      .set({
        isPremium: true,
        updatedAt: now,
      })
      .where(eq(userProfiles.id, userId));
  }

  async resetMonthlyUploads(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
  }

  // Stripe operations
  async updateStripeCustomerId(userId: string, customerId: string): Promise<typeof userProfiles.$inferSelect> {
    const [user] = await db
      .update(userProfiles)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    subscriptionId: string;
    status: string;
    periodEnd: Date;
  }): Promise<typeof userProfiles.$inferSelect> {
    const [user] = await db
      .update(userProfiles)
      .set({
        isPremium: subscriptionData.status === 'active',
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async cancelUserSubscription(userId: string): Promise<typeof userProfiles.$inferSelect> {
    const [user] = await db
      .update(userProfiles)
      .set({
        isPremium: false,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  // Flashcard job operations
  async createFlashcardJob(insertJob: InsertFlashcardJob): Promise<FlashcardJob> {
    const [job] = await db
      .insert(flashcardJobs)
      .values(insertJob)
      .returning();
    return job;
  }

  async getFlashcardJob(id: number): Promise<FlashcardJob | undefined> {
    const [job] = await db.select().from(flashcardJobs).where(eq(flashcardJobs.id, id));
    return job || undefined;
  }

  async updateFlashcardJob(id: number, updates: Partial<FlashcardJob>): Promise<FlashcardJob | undefined> {
    const [job] = await db
      .update(flashcardJobs)
      .set(updates)
      .where(eq(flashcardJobs.id, id))
      .returning();
    return job || undefined;
  }

  async updateJobFilename(id: number, filename: string): Promise<void> {
    await db
      .update(flashcardJobs)
      .set({ 
        filename,
        updatedAt: new Date()
      })
      .where(eq(flashcardJobs.id, id));
  }

  async deleteFlashcardJob(id: number): Promise<boolean> {
    try {
      const result = await db.delete(flashcardJobs).where(eq(flashcardJobs.id, id));
      return true; // If no error is thrown, deletion was successful
    } catch (error) {
      console.error(`Failed to delete job ${id}:`, error);
      return false;
    }
  }

  async getUserJobs(userId: string): Promise<FlashcardJob[]> {
    return await db
      .select()
      .from(flashcardJobs)
      .where(eq(flashcardJobs.userId, userId))
      .orderBy(desc(flashcardJobs.createdAt));
  }

  // Normalized flashcard operations
  async createFlashcards(flashcardList: InsertFlashcard[]): Promise<Flashcard[]> {
    return await db.insert(flashcards).values(flashcardList).returning();
  }

  async getFlashcards(jobId: number): Promise<Flashcard[]> {
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.jobId, jobId))
      .orderBy(flashcards.cardIndex);
  }

  async getFlashcard(id: number): Promise<Flashcard | undefined> {
    const [flashcard] = await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.id, id));
    return flashcard || undefined;
  }

  async updateFlashcard(id: number, updates: Partial<Flashcard>): Promise<Flashcard | undefined> {
    const [updated] = await db
      .update(flashcards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(flashcards.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteFlashcards(jobId: number): Promise<boolean> {
    try {
      await db.delete(flashcards).where(eq(flashcards.jobId, jobId));
      return true;
    } catch (error) {
      console.error(`Failed to delete flashcards for job ${jobId}:`, error);
      return false;
    }
  }

  // Study progress operations
  async getStudyProgress(userId: string, jobId: number): Promise<StudyProgress[]> {
    return await db
      .select()
      .from(studyProgress)
      .where(and(eq(studyProgress.userId, userId), eq(studyProgress.jobId, jobId)))
      .orderBy(studyProgress.flashcardId);
  }

  async updateStudyProgress(progressData: InsertStudyProgress): Promise<StudyProgress> {
    const existing = await db
      .select()
      .from(studyProgress)
      .where(and(
        eq(studyProgress.userId, progressData.userId),
        eq(studyProgress.jobId, progressData.jobId),
        eq(studyProgress.cardIndex, progressData.cardIndex)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(studyProgress)
        .set({
          ...progressData,
          reviewCount: sql`${studyProgress.reviewCount} + 1`,
          updatedAt: new Date()
        })
        .where(eq(studyProgress.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(studyProgress)
        .values({ ...progressData, reviewCount: 1 })
        .returning();
      return created;
    }
  }

  async getStudyStats(userId: string, jobId: number): Promise<{ total: number; known: number; reviewing: number }> {
    const flashcardsData = await this.getFlashcards(jobId);
    const total = flashcardsData.length;

    const progress = await this.getStudyProgress(userId, jobId);
    const known = progress.filter(p => p.status === 'known').length;
    const reviewing = progress.filter(p => p.status === 'reviewing').length;

    return { total, known, reviewing };
  }

  async upsertStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress> {
    try {
      // Check if record exists first
      const existing = await db
        .select()
        .from(studyProgress)
        .where(and(
          eq(studyProgress.userId, progress.userId),
          eq(studyProgress.jobId, progress.jobId),
          eq(studyProgress.cardIndex, progress.cardIndex)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        const [updatedProgress] = await db
          .update(studyProgress)
          .set({
            status: progress.status,
            difficultyRating: progress.difficultyRating,
            lastReviewedAt: progress.lastReviewedAt || new Date(),
            nextReviewDate: progress.nextReviewDate,
            reviewCount: sql`${studyProgress.reviewCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(studyProgress.id, existing[0].id))
          .returning();
        return updatedProgress;
      } else {
        // Insert new record
        const [newProgress] = await db
          .insert(studyProgress)
          .values({
            ...progress,
            reviewCount: 1,
            lastReviewedAt: progress.lastReviewedAt || new Date(),
          })
          .returning();
        return newProgress;
      }
    } catch (error) {
      console.error('Error upserting study progress:', error);
      throw new Error('Failed to save study progress');
    }
  }

  async batchUpdateStudyProgress(progressList: InsertStudyProgress[]): Promise<StudyProgress[]> {
    if (progressList.length === 0) return [];
    
    try {
      const results: StudyProgress[] = [];
      
      // Process in batches of 20 to avoid database limits and improve performance
      const batchSize = 20;
      for (let i = 0; i < progressList.length; i += batchSize) {
        const batch = progressList.slice(i, i + batchSize);
        
        // Process batch items concurrently for better performance
        const batchPromises = batch.map(progress => this.upsertStudyProgress(progress));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      
      return results;
    } catch (error) {
      throw new Error('Failed to batch update study progress');
    }
  }

  async getOptimizedFlashcards(jobId: number, userId: string): Promise<{ flashcards: any[]; progress: StudyProgress[] }> {
    try {
      // Get flashcards from normalized table
      const flashcards = await this.getFlashcards(jobId);
      if (!flashcards.length) {
        throw new Error('Flashcards not found');
      }
      
      // Get all study progress for this user and job in single query
      const progress = await this.getStudyProgress(userId, jobId);
      
      // Create optimized flashcard objects with progress data
      const optimizedFlashcards = flashcards.map((card) => {
        const cardProgress = progress.find(p => p.flashcardId === card.id);
        
        return {
          ...card,
          cardIndex: card.cardIndex,
          progress: cardProgress ? {
            status: cardProgress.status,
            reviewCount: cardProgress.reviewCount,
            lastReviewedAt: cardProgress.lastReviewedAt,
            nextReviewDate: cardProgress.nextReviewDate,
            difficultyRating: cardProgress.difficultyRating
          } : {
            status: 'new',
            reviewCount: 0,
            lastReviewedAt: null,
            nextReviewDate: null,
            difficultyRating: null
          }
        };
      });

      return { flashcards: optimizedFlashcards, progress };
    } catch (error) {
      console.error('Failed to get optimized flashcards:', error);
      throw new Error('Failed to load study data');
    }
  }

  // Study session operations
  async createStudySession(sessionData: InsertStudySession): Promise<StudySession> {
    try {
      console.log('Creating study session with data:', sessionData);
      const [session] = await db
        .insert(studySessions)
        .values(sessionData)
        .returning();
      console.log('Study session created successfully:', session);
      return session;
    } catch (error) {
      console.error('Study session creation error:', error);
      console.error('Session data that failed:', sessionData);
      throw new Error(`Failed to create study session: ${(error as Error).message}`);
    }
  }

  async updateStudySession(sessionId: number, updates: Partial<StudySession>): Promise<StudySession> {
    try {
      const [session] = await db
        .update(studySessions)
        .set(updates)
        .where(eq(studySessions.id, sessionId))
        .returning();
      
      if (!session) {
        throw new Error('Study session not found');
      }
      return session;
    } catch (error) {
      throw new Error('Failed to update study session');
    }
  }

  async completeStudySession(sessionId: number, stats: { cardsStudied: number; accuracy: number }): Promise<StudySession> {
    try {
      const session = await db
        .select()
        .from(studySessions)
        .where(eq(studySessions.id, sessionId))
        .limit(1);

      if (session.length === 0) {
        throw new Error('Study session not found');
      }

      const startTime = session[0].startedAt;
      const endTime = new Date();
      const durationSeconds = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0;

      const [completedSession] = await db
        .update(studySessions)
        .set({
          completedAt: endTime,
          cardsStudied: stats.cardsStudied,
          cardsCorrect: Math.round(stats.cardsStudied * (stats.accuracy / 100)),
          accuracyPercentage: stats.accuracy,
          durationSeconds
        })
        .where(eq(studySessions.id, sessionId))
        .returning();

      return completedSession;
    } catch (error) {
      throw new Error('Failed to complete study session');
    }
  }

  async getUserStudySessions(userId: string, jobId?: number): Promise<StudySession[]> {
    try {
      if (jobId) {
        const sessions = await db
          .select()
          .from(studySessions)
          .where(and(eq(studySessions.userId, userId), eq(studySessions.jobId, jobId)))
          .orderBy(desc(studySessions.createdAt))
          .limit(50);
        return sessions;
      } else {
        const sessions = await db
          .select()
          .from(studySessions)
          .where(eq(studySessions.userId, userId))
          .orderBy(desc(studySessions.createdAt))
          .limit(50);
        return sessions;
      }
    } catch (error) {
      throw new Error('Failed to get user study sessions');
    }
  }
}

export const storage = new DatabaseStorage();