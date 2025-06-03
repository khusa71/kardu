import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const flashcardJobs = pgTable("flashcard_jobs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  apiProvider: text("api_provider").notNull(), // 'openai' | 'anthropic'
  flashcardCount: integer("flashcard_count").notNull(),
  status: text("status").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  progress: integer("progress").default(0), // 0-100
  currentTask: text("current_task"),
  flashcards: text("flashcards"), // JSON string of generated flashcards
  ankiDeckPath: text("anki_deck_path"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFlashcardJobSchema = createInsertSchema(flashcardJobs).omit({
  id: true,
  createdAt: true,
});

export type InsertFlashcardJob = z.infer<typeof insertFlashcardJobSchema>;
export type FlashcardJob = typeof flashcardJobs.$inferSelect;

export interface FlashcardPair {
  question: string;
  answer: string;
  topic?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface ProcessingUpdate {
  jobId: number;
  status: string;
  progress: number;
  currentTask: string;
  errorMessage?: string;
}
