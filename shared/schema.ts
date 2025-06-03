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

// User storage table for Firebase Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(), // Firebase UID
  email: varchar("email").unique().notNull(),
  displayName: varchar("display_name"),
  photoURL: varchar("photo_url"),
  provider: varchar("provider").notNull(), // 'google' | 'email'
  isEmailVerified: boolean("is_email_verified").default(false),
  isPremium: boolean("is_premium").default(false),
  monthlyUploads: integer("monthly_uploads").default(0),
  monthlyLimit: integer("monthly_limit").default(3),
  lastUploadDate: timestamp("last_upload_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const flashcardJobs = pgTable("flashcard_jobs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
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
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

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
