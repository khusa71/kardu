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
  getUserJobs(userId: string): Promise<FlashcardJob[]>;
  updateFlashcardJob(id: number, updates: Partial<FlashcardJob>): Promise<void>;
  deleteFlashcardJob(id: number): Promise<void>;
  updateJobFilename(id: number, filename: string): Promise<void>;
  getFlashcardJobs(limit?: number): Promise<FlashcardJob[]>;

  // Study progress operations
  upsertStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  getStudyProgress(userId: string, jobId: number): Promise<StudyProgress[]>;
  getUserProgress(userId: string): Promise<UserProfile | undefined>;
  getUserStats(userId: string): Promise<{ totalCards: number; knownCards: number; totalJobs: number }>;
  getStudyStats(userId: string, jobId: number): Promise<{ total: number; known: number; reviewing: number }>;
}

export class SupabaseStorage implements IStorage {
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
            monthlyUploads: userData.monthlyUploads,
            monthlyLimit: userData.monthlyLimit,
            monthlyPagesProcessed: userData.monthlyPagesProcessed,
            lastUploadDate: userData.lastUploadDate,
            lastResetDate: userData.lastResetDate,
            stripeCustomerId: userData.stripeCustomerId,
            stripeSubscriptionId: userData.stripeSubscriptionId,
            subscriptionStatus: userData.subscriptionStatus,
            subscriptionPeriodEnd: userData.subscriptionPeriodEnd,
            updatedAt: new Date(),
          },
        })
        .returning();
      return profile;
    } catch (error) {
      console.error("Error upserting user profile:", error);
      throw error;
    }
  }

  async incrementUserUploads(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        monthlyUploads: sql`${userProfiles.monthlyUploads} + 1`,
        lastUploadDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
  }

  async checkUploadLimit(userId: string): Promise<{ canUpload: boolean; uploadsRemaining: number }> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
    
    if (!profile) {
      return { canUpload: false, uploadsRemaining: 0 };
    }

    const monthlyLimit = profile.monthlyLimit || 3;
    const monthlyUploads = profile.monthlyUploads || 0;
    const uploadsRemaining = Math.max(0, monthlyLimit - monthlyUploads);
    
    return {
      canUpload: uploadsRemaining > 0,
      uploadsRemaining,
    };
  }

  async upgradeToPremium(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        isPremium: true,
        monthlyLimit: 50, // Premium limit
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
  }

  async resetMonthlyUploads(userId: string): Promise<void> {
    await db
      .update(userProfiles)
      .set({
        monthlyUploads: 0,
        monthlyPagesProcessed: 0,
        lastResetDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId));
  }

  // Stripe operations
  async updateStripeCustomerId(userId: string, customerId: string): Promise<UserProfile> {
    const [profile] = await db
      .update(userProfiles)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();
    return profile;
  }

  async updateUserSubscription(userId: string, subscriptionData: {
    subscriptionId: string;
    status: string;
    periodEnd: Date;
  }): Promise<UserProfile> {
    const [profile] = await db
      .update(userProfiles)
      .set({
        stripeSubscriptionId: subscriptionData.subscriptionId,
        subscriptionStatus: subscriptionData.status,
        subscriptionPeriodEnd: subscriptionData.periodEnd,
        isPremium: subscriptionData.status === 'active',
        monthlyLimit: subscriptionData.status === 'active' ? 50 : 3,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();
    return profile;
  }

  async cancelUserSubscription(userId: string): Promise<UserProfile> {
    const [profile] = await db
      .update(userProfiles)
      .set({
        subscriptionStatus: 'canceled',
        isPremium: false,
        monthlyLimit: 3,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();
    return profile;
  }

  // Flashcard job operations
  async createFlashcardJob(job: InsertFlashcardJob): Promise<FlashcardJob> {
    const [newJob] = await db.insert(flashcardJobs).values(job).returning();
    return newJob;
  }

  async getFlashcardJob(id: number): Promise<FlashcardJob | undefined> {
    const [job] = await db.select().from(flashcardJobs).where(eq(flashcardJobs.id, id));
    return job || undefined;
  }

  async getUserJobs(userId: string): Promise<FlashcardJob[]> {
    return await db
      .select()
      .from(flashcardJobs)
      .where(eq(flashcardJobs.userId, userId))
      .orderBy(desc(flashcardJobs.createdAt));
  }

  async updateFlashcardJob(id: number, updates: Partial<FlashcardJob>): Promise<void> {
    await db
      .update(flashcardJobs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(flashcardJobs.id, id));
  }

  async deleteFlashcardJob(id: number): Promise<void> {
    await db.delete(flashcardJobs).where(eq(flashcardJobs.id, id));
  }

  async updateJobFilename(id: number, filename: string): Promise<void> {
    await db.update(flashcardJobs).set({ filename, updatedAt: new Date() }).where(eq(flashcardJobs.id, id));
  }

  async getFlashcardJobs(limit: number = 50): Promise<FlashcardJob[]> {
    return await db
      .select()
      .from(flashcardJobs)
      .orderBy(desc(flashcardJobs.createdAt))
      .limit(limit);
  }

  // Study progress operations
  async upsertStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress> {
    const [result] = await db
      .insert(studyProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [studyProgress.userId, studyProgress.jobId, studyProgress.cardIndex],
        set: {
          status: progress.status,
          lastReviewedAt: progress.lastReviewedAt,
          nextReviewDate: progress.nextReviewDate,
          difficultyRating: progress.difficultyRating,
          reviewCount: sql`${studyProgress.reviewCount} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async getStudyProgress(userId: string, jobId: number): Promise<StudyProgress[]> {
    return await db
      .select()
      .from(studyProgress)
      .where(and(eq(studyProgress.userId, userId), eq(studyProgress.jobId, jobId)));
  }

  async getUserProgress(userId: string): Promise<UserProfile | undefined> {
    return this.getUserProfile(userId);
  }

  async getUserStats(userId: string): Promise<{ totalCards: number; knownCards: number; totalJobs: number }> {
    const jobs = await this.getUserJobs(userId);
    const totalJobs = jobs.length;
    
    const progressResults = await db
      .select()
      .from(studyProgress)
      .where(eq(studyProgress.userId, userId));

    const totalCards = progressResults.length;
    const knownCards = progressResults.filter(p => p.status === 'known').length;

    return { totalCards, knownCards, totalJobs };
  }

  async getStudyStats(userId: string, jobId: number): Promise<{ total: number; known: number; reviewing: number }> {
    const progressResults = await db
      .select()
      .from(studyProgress)
      .where(and(eq(studyProgress.userId, userId), eq(studyProgress.jobId, jobId)));

    const total = progressResults.length;
    const known = progressResults.filter(p => p.status === 'known').length;
    const reviewing = progressResults.filter(p => p.status === 'reviewing').length;

    return { total, known, reviewing };
  }
}

export const storage = new SupabaseStorage();