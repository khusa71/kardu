import {
  users,
  flashcardJobs,
  type User,
  type UpsertUser,
  type FlashcardJob,
  type InsertFlashcardJob,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations for Firebase Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  incrementUserUploads(userId: string): Promise<void>;
  checkUploadLimit(userId: string): Promise<{ canUpload: boolean; uploadsRemaining: number }>;
  upgradeToPremium(userId: string): Promise<void>;
  resetMonthlyUploads(userId: string): Promise<void>;
  
  // Stripe operations
  updateStripeCustomerId(userId: string, customerId: string): Promise<User>;
  updateUserSubscription(userId: string, subscriptionData: {
    subscriptionId: string;
    status: string;
    periodEnd: Date;
  }): Promise<User>;
  cancelUserSubscription(userId: string): Promise<User>;
  
  // Flashcard job operations
  createFlashcardJob(job: InsertFlashcardJob): Promise<FlashcardJob>;
  getFlashcardJob(id: number): Promise<FlashcardJob | undefined>;
  updateFlashcardJob(id: number, updates: Partial<FlashcardJob>): Promise<FlashcardJob | undefined>;
  deleteFlashcardJob(id: number): Promise<boolean>;
  getUserJobs(userId: string): Promise<FlashcardJob[]>;
  
  // Study progress operations
  getStudyProgress(userId: string, jobId: number): Promise<StudyProgress[]>;
  updateStudyProgress(progress: InsertStudyProgress): Promise<StudyProgress>;
  getStudyStats(userId: string, jobId: number): Promise<{ total: number; known: number; reviewing: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL,
            provider: userData.provider,
            isEmailVerified: userData.isEmailVerified,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error) {
      console.error("Error upserting user:", error);
      throw error;
    }
  }

  async incrementUserUploads(userId: string): Promise<void> {
    const now = new Date();
    const user = await this.getUser(userId);
    if (user) {
      await db
        .update(users)
        .set({
          monthlyUploads: (user.monthlyUploads || 0) + 1,
          lastUploadDate: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
    }
  }

  async checkUploadLimit(userId: string): Promise<{ canUpload: boolean; uploadsRemaining: number }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { canUpload: false, uploadsRemaining: 0 };
    }

    // Reset monthly uploads if it's a new month
    const now = new Date();
    const lastUpload = user.lastUploadDate;
    
    if (lastUpload) {
      const currentMonth = now.getFullYear() * 12 + now.getMonth();
      const lastUploadMonth = lastUpload.getFullYear() * 12 + lastUpload.getMonth();
      
      if (currentMonth > lastUploadMonth) {
        // Reset monthly uploads
        await db
          .update(users)
          .set({
            monthlyUploads: 0,
            updatedAt: now,
          })
          .where(eq(users.id, userId));
        
        return { canUpload: true, uploadsRemaining: (user.monthlyLimit || 3) - 1 };
      }
    }

    const uploadsUsed = user.monthlyUploads || 0;
    const uploadsRemaining = Math.max(0, (user.monthlyLimit || 3) - uploadsUsed);
    const canUpload = uploadsRemaining > 0;

    return { canUpload, uploadsRemaining };
  }

  async upgradeToPremium(userId: string): Promise<void> {
    const now = new Date();
    console.log('Upgrading user to premium with timestamp:', now.toISOString());
    
    await db
      .update(users)
      .set({
        isPremium: true,
        monthlyLimit: 100,
        updatedAt: now,
      })
      .where(eq(users.id, userId));
  }

  async resetMonthlyUploads(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        monthlyUploads: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  // Stripe operations
  async updateStripeCustomerId(userId: string, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId: customerId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeSubscriptionId: subscriptionData.subscriptionId,
        subscriptionStatus: subscriptionData.status,
        subscriptionPeriodEnd: subscriptionData.periodEnd,
        isPremium: subscriptionData.status === 'active',
        monthlyLimit: subscriptionData.status === 'active' ? 100 : 3,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async cancelUserSubscription(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: 'canceled',
        isPremium: false,
        monthlyLimit: 3,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
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
}

export const storage = new DatabaseStorage();