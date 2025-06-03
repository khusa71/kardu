import { flashcardJobs, type FlashcardJob, type InsertFlashcardJob } from "@shared/schema";

export interface IStorage {
  createFlashcardJob(job: InsertFlashcardJob): Promise<FlashcardJob>;
  getFlashcardJob(id: number): Promise<FlashcardJob | undefined>;
  updateFlashcardJob(id: number, updates: Partial<FlashcardJob>): Promise<FlashcardJob | undefined>;
  deleteFlashcardJob(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private jobs: Map<number, FlashcardJob>;
  private currentId: number;

  constructor() {
    this.jobs = new Map();
    this.currentId = 1;
  }

  async createFlashcardJob(insertJob: InsertFlashcardJob): Promise<FlashcardJob> {
    const id = this.currentId++;
    const job: FlashcardJob = {
      ...insertJob,
      id,
      createdAt: new Date(),
    };
    this.jobs.set(id, job);
    return job;
  }

  async getFlashcardJob(id: number): Promise<FlashcardJob | undefined> {
    return this.jobs.get(id);
  }

  async updateFlashcardJob(id: number, updates: Partial<FlashcardJob>): Promise<FlashcardJob | undefined> {
    const existing = this.jobs.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.jobs.set(id, updated);
    return updated;
  }

  async deleteFlashcardJob(id: number): Promise<boolean> {
    return this.jobs.delete(id);
  }
}

export const storage = new MemStorage();
