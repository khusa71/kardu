import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Use Supabase PostgreSQL connection with connection pooling
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseDbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL must be set for database connection");
}

// Extract project reference from Supabase URL
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];

let connectionUrl: string;

// Use Supabase connection pooling format
if (supabaseDbPassword) {
  connectionUrl = `postgresql://postgres.${projectRef}:${supabaseDbPassword}@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  console.log(`Connecting to Supabase database with connection pooling: ${projectRef}`);
} else {
  throw new Error("SUPABASE_DB_PASSWORD must be set for database connection");
}

const sql = postgres(connectionUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });