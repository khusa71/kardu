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
  real,
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

// User profiles table - matching actual database schema
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().notNull(),
  email: text("email").notNull(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  isPremium: boolean("is_premium").default(false),
  role: text("role").default("user"), // user, admin, moderator
  subscriptionStatus: text("subscription_status"),
  subscriptionTier: text("subscription_tier").default("free"),
  uploadsThisMonth: integer("uploads_this_month").default(0),
  maxMonthlyUploads: integer("max_monthly_uploads").default(3),
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
  cardIndex: integer("card_index").notNull(), // Position in original set
  front: text("front").notNull(), // Question/prompt
  back: text("back").notNull(), // Answer/explanation
  subject: text("subject"), // Subject category
  difficulty: text("difficulty"), // 'beginner' | 'intermediate' | 'advanced'
  tags: text("tags").array(), // Array of tags for categorization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_flashcards_job").on(table.jobId),
  index("idx_flashcards_subject").on(table.subject),
  index("idx_flashcards_unique").on(table.jobId, table.cardIndex),
]);

export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  jobId: integer("job_id").notNull().references(() => flashcardJobs.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  durationSeconds: integer("duration_seconds"),
  cardsStudied: integer("cards_studied").default(0),
  cardsCorrect: integer("cards_correct").default(0),
  accuracyPercentage: real("accuracy_percentage").default(0),
  sessionType: text("session_type").default("review"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_study_sessions_user_id").on(table.userId),
  index("idx_study_sessions_job_id").on(table.jobId),
  index("idx_study_sessions_started_at").on(table.startedAt),
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

// User preferences table for settings
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  studySessionLength: integer("study_session_length").default(20), // Default 20 cards per session
  dailyStudyGoal: integer("daily_study_goal").default(50), // Default 50 cards per day
  difficultyProgression: text("difficulty_progression").default("adaptive"), // 'adaptive' | 'manual'
  spaceRepetitionInterval: text("space_repetition_interval").default("sm2"), // 'sm2' | 'custom'
  notificationsEnabled: boolean("notifications_enabled").default(true),
  emailNotifications: boolean("email_notifications").default(true),
  studyReminders: boolean("study_reminders").default(true),
  weeklyReports: boolean("weekly_reports").default(true),
  theme: text("theme").default("system"), // 'light' | 'dark' | 'system'
  language: text("language").default("en"), // ISO language code
  timezone: text("timezone").default("UTC"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_preferences_user").on(table.userId),
]);

// Support tickets table
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  category: text("category").notNull(), // 'bug' | 'feature' | 'account' | 'billing' | 'general'
  priority: text("priority").default("medium"), // 'low' | 'medium' | 'high' | 'urgent'
  status: text("status").default("open"), // 'open' | 'in_progress' | 'closed' | 'resolved'
  adminResponse: text("admin_response"),
  respondedAt: timestamp("responded_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_tickets_user").on(table.userId),
  index("idx_support_tickets_status").on(table.status),
  index("idx_support_tickets_priority").on(table.priority),
  index("idx_support_tickets_category").on(table.category),
]);

// Admin settings table for configurable AI models
export const adminSettings = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  settingKey: varchar("setting_key", { length: 50 }).notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => userProfiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_admin_settings_key").on(table.settingKey),
]);

// Subscription history table for billing management
export const subscriptionHistory = pgTable("subscription_history", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  subscriptionId: text("subscription_id"), // Stripe subscription ID
  planType: text("plan_type").notNull(), // 'free' | 'pro' | 'enterprise'
  status: text("status").notNull(), // 'active' | 'cancelled' | 'expired' | 'past_due'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  amount: numeric("amount", { precision: 10, scale: 2 }), // Monthly amount
  currency: text("currency").default("USD"),
  paymentMethod: text("payment_method"), // 'card' | 'paypal' | etc
  stripeCustomerId: text("stripe_customer_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_subscription_history_user").on(table.userId),
  index("idx_subscription_history_status").on(table.status),
  index("idx_subscription_history_dates").on(table.startDate, table.endDate),
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

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory).omit({
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
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = z.infer<typeof insertSubscriptionHistorySchema>;

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
