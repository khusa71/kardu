import fs from 'fs';
import path from 'path';

/**
 * Complete migration script to update routes.ts and remove all JSON flashcard storage
 */
export function generateMigratedRoutes(): string {
  const routesPath = path.join(__dirname, 'routes.ts');
  let content = fs.readFileSync(routesPath, 'utf8');
  
  // Replace all occurrences of JSON flashcard storage with normalized operations
  const replacements = [
    {
      pattern: /flashcards: JSON\.stringify\(flashcards\),/g,
      replacement: 'flashcardCount: flashcards.length,'
    },
    {
      pattern: /await storage\.updateFlashcardJob\(jobId, \{\s*progress: (\d+),\s*currentTask: "([^"]+)",\s*flashcards: JSON\.stringify\(flashcards\),\s*\}\);/g,
      replacement: `await updateJobProgressWithNormalizedFlashcards(
        storage, jobId, userId, flashcards, subject, difficulty,
        $1, "$2"
      );`
    },
    {
      pattern: /if \(cachedFlashcards\) \{\s*flashcards = cachedFlashcards;\s*await storage\.updateFlashcardJob\(jobId, \{\s*progress: 80,\s*currentTask: "Retrieved from cache \(cost-optimized\)",\s*flashcards: JSON\.stringify\(flashcards\),\s*\}\);/g,
      replacement: `if (cachedFlashcards) {
      flashcards = cachedFlashcards;
      await updateJobProgressWithNormalizedFlashcards(
        storage, jobId, userId, flashcards, subject, difficulty,
        80, "Retrieved from cache (cost-optimized)"
      );`
    }
  ];
  
  // Apply all replacements
  replacements.forEach(({ pattern, replacement }) => {
    content = content.replace(pattern, replacement);
  });
  
  return content;
}

/**
 * Execute the complete migration
 */
export function executeCompleteMigration(): void {
  const migratedContent = generateMigratedRoutes();
  const routesPath = path.join(__dirname, 'routes.ts');
  
  // Backup original file
  fs.writeFileSync(routesPath + '.backup', fs.readFileSync(routesPath, 'utf8'));
  
  // Write migrated content
  fs.writeFileSync(routesPath, migratedContent);
  
  console.log('Migration completed successfully');
}