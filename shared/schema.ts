import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User profiles table for Supabase Auth (extends auth.users)
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().notNull(), // Supabase UID from auth.users
  isPremium: boolean("is_premium").default(false),
  role: varchar("role").default("user"), // 'user' | 'admin' | 'moderator'
  monthlyUploads: integer("monthly_uploads").default(0),
  monthlyLimit: integer("monthly_limit").default(3),
  monthlyPagesProcessed: integer("monthly_pages_processed").default(0),
  lastUploadDate: timestamp("last_upload_date"),
  lastResetDate: timestamp("last_reset_date").defaultNow(),
  // Stripe fields
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionStatus: varchar("subscription_status"), // 'active' | 'canceled' | 'past_due' | null
  subscriptionPeriodEnd: timestamp("subscription_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const flashcardJobs = pgTable("flashcard_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => userProfiles.id),
  filename: text("filename").notNull(),
  fileSize: integer("file_size").notNull(),
  pageCount: integer("page_count"), // Number of pages in the PDF
  pagesProcessed: integer("pages_processed"), // Actual pages processed (may be less due to limits)
  pdfStorageKey: text("pdf_storage_key"), // Object Storage key for original PDF
  pdfDownloadUrl: text("pdf_download_url"), // Download URL for original PDF
  apiProvider: text("api_provider").notNull(), // 'openai' | 'anthropic'
  flashcardCount: integer("flashcard_count").notNull(),
  subject: text("subject"), // Store subject for better categorization
  difficulty: text("difficulty"), // Store difficulty level
  focusAreas: text("focus_areas"), // Store focus areas as JSON
  status: text("status").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  progress: integer("progress").default(0), // 0-100
  currentTask: text("current_task"),
  flashcards: text("flashcards"), // JSON string of generated flashcards
  ankiStorageKey: text("anki_storage_key"), // Object Storage key for Anki deck
  ankiDownloadUrl: text("anki_download_url"), // Download URL for Anki deck
  csvStorageKey: text("csv_storage_key"), // Object Storage key for CSV export
  csvDownloadUrl: text("csv_download_url"), // Download URL for CSV export
  jsonStorageKey: text("json_storage_key"), // Object Storage key for JSON export
  jsonDownloadUrl: text("json_download_url"), // Download URL for JSON export
  quizletStorageKey: text("quizlet_storage_key"), // Object Storage key for Quizlet export
  quizletDownloadUrl: text("quizlet_download_url"), // Download URL for Quizlet export
  errorMessage: text("error_message"),
  processingTime: integer("processing_time"), // Time taken in seconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  regeneratedFromJobId: integer("regenerated_from_job_id"),
});

export const studyProgress = pgTable("study_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  jobId: integer("job_id").notNull().references(() => flashcardJobs.id, { onDelete: "cascade" }),
  cardIndex: integer("card_index").notNull(),
  status: text("status").notNull(), // 'known', 'unknown', 'reviewing'
  lastReviewedAt: timestamp("last_reviewed_at").defaultNow(),
  nextReviewDate: timestamp("next_review_date"),
  difficultyRating: text("difficulty_rating"), // 'easy', 'medium', 'hard'
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFlashcardJobSchema = createInsertSchema(flashcardJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudyProgressSchema = createInsertSchema(studyProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFlashcardJob = z.infer<typeof insertFlashcardJobSchema>;
export type FlashcardJob = typeof flashcardJobs.$inferSelect;
export type UpsertUserProfile = typeof userProfiles.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type StudyProgress = typeof studyProgress.$inferSelect;
export type InsertStudyProgress = z.infer<typeof insertStudyProgressSchema>;

export interface FlashcardPair {
  id?: number;
  front: string;
  back: string;
  subject?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
}

export interface ProcessingUpdate {
  jobId: number;
  status: string;
  progress: number;
  currentTask: string;
  errorMessage?: string;
}
