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
  numeric,
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

// User profiles table - exact column names from current database
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email"),
  isPremium: boolean("is_premium").default(false),
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


  flashcardCount: integer("flashcard_count").notNull(),
  subject: text("subject"), // Store subject for better categorization
  difficulty: text("difficulty"), // Store difficulty level
  focusAreas: text("focus_areas"), // Store focus areas as JSON
  status: text("status").notNull(), // 'pending' | 'processing' | 'completed' | 'failed'
  progress: integer("progress").default(0), // 0-100
  currentTask: text("current_task"),
  // Removed permanent export storage - files generated on-demand
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
  cardIndex: integer("card_index").notNull(), // Legacy field for existing data
  flashcardId: integer("flashcard_id").references(() => flashcards.id, { onDelete: "cascade" }), // New normalized reference
  status: text("status").notNull(), // 'new', 'learning', 'reviewing', 'known'
  lastReviewedAt: timestamp("last_reviewed_at").defaultNow(),
  nextReviewDate: timestamp("next_review_date"),
  difficultyRating: text("difficulty_rating"), // 'easy', 'medium', 'hard'
  reviewCount: integer("review_count").default(0),
  correctStreak: integer("correct_streak").default(0), // Consecutive correct answers
  totalReviews: integer("total_reviews").default(0), // Total review attempts
  correctReviews: integer("correct_reviews").default(0), // Correct review attempts
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_study_progress_user_job").on(table.userId, table.jobId),
  index("idx_study_progress_flashcard").on(table.flashcardId),
  index("idx_study_progress_unique").on(table.userId, table.flashcardId),
  index("idx_study_progress_next_review").on(table.nextReviewDate),
]);

// Normalized flashcards table - each card as separate record
export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => flashcardJobs.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  cardIndex: integer("card_index").notNull(), // Position in original set
  front: text("front").notNull(), // Question/prompt
  back: text("back").notNull(), // Answer/explanation
  subject: text("subject"), // Subject category
  difficulty: text("difficulty"), // 'beginner' | 'intermediate' | 'advanced'
  tags: text("tags").array(), // Array of tags for categorization
  confidence: numeric("confidence", { precision: 3, scale: 2 }), // AI confidence score (0.00-1.00)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_flashcards_job").on(table.jobId),
  index("idx_flashcards_user").on(table.userId),
  index("idx_flashcards_subject").on(table.subject),
  index("idx_flashcards_unique").on(table.jobId, table.cardIndex),
]);

export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  jobId: integer("job_id").notNull().references(() => flashcardJobs.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  totalCards: integer("total_cards").notNull(),
  cardsStudied: integer("cards_studied").default(0),
  accuracy: integer("accuracy").default(0), // Percentage as integer (0 to 100)
  sessionDuration: integer("session_duration"), // Duration in seconds
  status: text("status").notNull().default("active"), // 'active', 'completed', 'abandoned'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_study_sessions_user").on(table.userId),
  index("idx_study_sessions_job").on(table.jobId),
  index("idx_study_sessions_date").on(table.createdAt),
]);

// Temporary downloads table for on-demand file generation
export const temporaryDownloads = pgTable("temporary_downloads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  jobId: integer("job_id").notNull().references(() => flashcardJobs.id, { onDelete: "cascade" }),
  format: text("format").notNull(), // 'anki' | 'csv' | 'json' | 'quizlet'
  storageKey: text("storage_key").notNull(),
  downloadUrl: text("download_url").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_temporary_downloads_user").on(table.userId),
  index("idx_temporary_downloads_job").on(table.jobId),
  index("idx_temporary_downloads_expires").on(table.expiresAt),
]);

export const insertFlashcardJobSchema = createInsertSchema(flashcardJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudyProgressSchema = createInsertSchema(studyProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudySessionSchema = createInsertSchema(studySessions);

export const insertTemporaryDownloadSchema = createInsertSchema(temporaryDownloads).omit({
  id: true,
  createdAt: true,
});

export type InsertFlashcardJob = z.infer<typeof insertFlashcardJobSchema>;
export type FlashcardJob = typeof flashcardJobs.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type UpsertUserProfile = typeof userProfiles.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type StudyProgress = typeof studyProgress.$inferSelect;
export type InsertStudyProgress = z.infer<typeof insertStudyProgressSchema>;
export type StudySession = typeof studySessions.$inferSelect;
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type TemporaryDownload = typeof temporaryDownloads.$inferSelect;
export type InsertTemporaryDownload = z.infer<typeof insertTemporaryDownloadSchema>;

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
