import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Add missing quota tracking columns to user_profiles table
 */
export async function addQuotaColumns() {
  try {
    console.log("Adding quota tracking columns to user_profiles table...");

    // Add monthly_uploads column
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE user_profiles 
        ADD COLUMN monthly_uploads INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add monthly_pages_processed column
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE user_profiles 
        ADD COLUMN monthly_pages_processed INTEGER DEFAULT 0;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add monthly_limit column
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE user_profiles 
        ADD COLUMN monthly_limit INTEGER DEFAULT 3;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add last_reset_date column
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE user_profiles 
        ADD COLUMN last_reset_date TIMESTAMP DEFAULT NOW();
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Add last_upload_date column
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE user_profiles 
        ADD COLUMN last_upload_date TIMESTAMP;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END $$;
    `);

    // Update existing users with proper monthly limits based on premium status
    await db.execute(sql`
      UPDATE user_profiles 
      SET monthly_limit = CASE 
        WHEN is_premium = true THEN 100 
        ELSE 3 
      END
      WHERE monthly_limit IS NULL OR monthly_limit = 0;
    `);

    console.log("✅ Successfully added quota tracking columns");
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to add quota columns:", error);
    return { success: false, error: (error as Error).message || 'Unknown error' };
  }
}