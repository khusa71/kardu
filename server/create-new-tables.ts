import { db } from './db';
import { sql } from 'drizzle-orm';

export async function createNewTables() {
  try {
    console.log('Creating new database tables...');

    // Create user_preferences table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES user_profiles(id) NOT NULL,
        study_session_length INTEGER DEFAULT 20,
        daily_study_goal INTEGER DEFAULT 50,
        difficulty_progression TEXT DEFAULT 'adaptive',
        space_repetition_interval TEXT DEFAULT 'sm2',
        notifications_enabled BOOLEAN DEFAULT true,
        email_notifications BOOLEAN DEFAULT true,
        study_reminders BOOLEAN DEFAULT true,
        weekly_reports BOOLEAN DEFAULT true,
        theme TEXT DEFAULT 'system',
        language TEXT DEFAULT 'en',
        timezone TEXT DEFAULT 'UTC',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
    `);

    // Create support_tickets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES user_profiles(id) NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'open',
        admin_response TEXT,
        responded_at TIMESTAMP,
        closed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
    `);

    // Create subscription_history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS subscription_history (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES user_profiles(id) NOT NULL,
        subscription_id TEXT,
        plan_type TEXT NOT NULL,
        status TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        amount NUMERIC(10,2),
        currency TEXT DEFAULT 'USD',
        payment_method TEXT,
        stripe_customer_id TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON subscription_history(status);
      CREATE INDEX IF NOT EXISTS idx_subscription_history_dates ON subscription_history(start_date, end_date);
    `);

    console.log('✅ All new tables created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    return false;
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createNewTables().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}