import {
  userProfiles,
  flashcardJobs,
  studyProgress,
  type UserProfile,
  type UpsertUserProfile,
  type FlashcardJob,
  type InsertFlashcardJob,
  type StudyProgress,
  type InsertStudyProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User profile operations for Supabase Auth
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  upsertUserProfile(user: UpsertUserProfile): Promise<UserProfile>;
  incrementUserUploads(userId: string): Promise<void>;
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
  
  // Study progress operations
  getStudyProgress(userId: string, jobId: number): Promise<StudyProgress[]>;
  updateStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  upsertStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  getStudyStats(userId: string, jobId: number): Promise<{ total: number; known: number; reviewing: number }>;
}

export class DatabaseStorage implements IStorage {
  // User profile operations for Supabase Auth
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, id));
    return profile || undefined;
  }

  async upsertUserProfile(userData: UpsertUserProfile): Promise<UserProfile> {
    try {
      const [profile] = await db
        .insert(userProfiles)
        .values(userData)
        .onConflictDoUpdate({
          target: userProfiles.id,
          set: {
            isPremium: userData.isPremium,
            role: userData.role,
            isEmailVerified: userData.isEmailVerified,
            updatedAt: new Date(),
          },
        })
        .returning();
      return profile;
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }

  async incrementUserUploads(userId: string): Promise<void> {
    const now = new Date();
    try {
      await db
        .update(userProfiles)
        .set({
          monthlyUploads: sql`COALESCE(${userProfiles.monthlyUploads}, 0) + 1`,
          lastUploadDate: now,
          updatedAt: now,
        })
        .where(eq(userProfiles.id, userId));
    } catch (error) {
      console.error(`Failed to increment uploads for user ${userId}:`, error);
      throw new Error('Upload count update failed');
    }
  }

  async checkUploadLimit(userId: string): Promise<{ canUpload: boolean; uploadsRemaining: number }> {
    try {
      const user = await this.getUserProfile(userId);
      if (!user) {
        return { canUpload: false, uploadsRemaining: 0 };
      }

      const now = new Date();
      const lastUpload = user.lastUploadDate;
      
      // Check if monthly reset is needed
      if (lastUpload) {
        const currentMonth = now.getFullYear() * 12 + now.getMonth();
        const lastUploadMonth = lastUpload.getFullYear() * 12 + lastUpload.getMonth();
        
        if (currentMonth > lastUploadMonth) {
          // Atomic reset with updated data retrieval
          await db
            .update(userProfiles)
            .set({
              monthlyUploads: 0,
              lastResetDate: now,
              updatedAt: now,
            })
            .where(eq(userProfiles.id, userId));
          
          const monthlyLimit = user.monthlyLimit || (user.isPremium ? 100 : 3);
          return { canUpload: true, uploadsRemaining: monthlyLimit };
        }
      }

      const uploadsUsed = user.monthlyUploads || 0;
      const monthlyLimit = user.monthlyLimit || (user.isPremium ? 100 : 3);
      const uploadsRemaining = Math.max(0, monthlyLimit - uploadsUsed);
      const canUpload = uploadsRemaining > 0;

      return { canUpload, uploadsRemaining };
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
        monthlyLimit: 100,
        updatedAt: now,
      })
      .where(eq(userProfiles.id, userId));
  }

  async resetMonthlyUploads(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        monthlyUploads: 0,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
  }

  // Stripe operations
  async updateStripeCustomerId(userId: string, customerId: string): Promise<typeof userProfiles.$inferSelect> {
    const [user] = await db
      .update(userProfiles)
      .set({
        stripeCustomerId: customerId,
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
        stripeSubscriptionId: subscriptionData.subscriptionId,
        subscriptionStatus: subscriptionData.status,
        subscriptionPeriodEnd: subscriptionData.periodEnd,
        isPremium: subscriptionData.status === 'active',
        monthlyLimit: subscriptionData.status === 'active' ? 100 : 3,
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
        subscriptionStatus: 'canceled',
        isPremium: false,
        monthlyLimit: 3,
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
    const result = await db.delete(flashcardJobs).where(eq(flashcardJobs.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUserJobs(userId: string): Promise<FlashcardJob[]> {
    return await db
      .select()
      .from(flashcardJobs)
      .where(eq(flashcardJobs.userId, userId))
      .orderBy(desc(flashcardJobs.createdAt));
  }

  // Study progress operations
  async getStudyProgress(userId: string, jobId: number): Promise<StudyProgress[]> {
    return await db
      .select()
      .from(studyProgress)
      .where(and(eq(studyProgress.userId, userId), eq(studyProgress.jobId, jobId)))
      .orderBy(studyProgress.cardIndex);
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
    const job = await this.getFlashcardJob(jobId);
    if (!job || !job.flashcards) {
      return { total: 0, known: 0, reviewing: 0 };
    }

    const flashcardsData = JSON.parse(job.flashcards);
    const total = flashcardsData.length;

    const progress = await this.getStudyProgress(userId, jobId);
    const known = progress.filter(p => p.status === 'known').length;
    const reviewing = progress.filter(p => p.status === 'reviewing').length;

    return { total, known, reviewing };
  }

  async upsertStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress> {
    const [updatedProgress] = await db
      .insert(studyProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [studyProgress.userId, studyProgress.jobId, studyProgress.cardIndex],
        set: {
          status: progress.status,
          difficultyRating: progress.difficultyRating,
          lastReviewedAt: progress.lastReviewedAt,
          nextReviewDate: progress.nextReviewDate,
          updatedAt: new Date(),
        },
      })
      .returning();
    return updatedProgress;
  }
}

export const storage = new DatabaseStorage();