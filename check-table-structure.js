// Quick script to check the actual study_sessions table structure
const { sql } = require('drizzle-orm');
const { db } = require('./server/db.ts');

async function checkTableStructure() {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'study_sessions' 
      ORDER BY ordinal_position;
    `);
    console.log('study_sessions table structure:');
    console.log(result);
  } catch (error) {
    console.error('Error checking table structure:', error);
  }
}

checkTableStructure();