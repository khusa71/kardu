// Performance optimization service for faster PDF processing
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private processingQueue: Map<string, Promise<any>> = new Map();
  
  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Optimize text chunking for faster processing
  optimizeTextChunking(text: string, maxChunkSize: number = 8000): string[] {
    const chunks: string[] = [];
    
    // Use larger chunks to reduce API calls and improve context
    const lines = text.split('\n');
    let currentChunk = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and obvious noise
      if (!trimmedLine || trimmedLine.length < 10) continue;
      
      // Skip page numbers and headers
      if (/^\s*\d+\s*$/.test(trimmedLine)) continue;
      if (/^(page|chapter|\d+\s*of\s*\d+)/i.test(trimmedLine)) continue;
      
      if (currentChunk.length + trimmedLine.length + 1 <= maxChunkSize) {
        currentChunk += (currentChunk ? '\n' : '') + trimmedLine;
      } else {
        if (currentChunk.length > 500) { // Only add substantial chunks
          chunks.push(currentChunk);
        }
        currentChunk = trimmedLine;
      }
    }
    
    if (currentChunk.length > 500) {
      chunks.push(currentChunk);
    }
    
    // Limit to 4 chunks for faster processing
    return chunks.slice(0, 4);
  }

  // Batch process multiple requests for better performance
  async batchProcess<T>(
    items: any[],
    processor: (item: any) => Promise<T>,
    batchSize: number = 3
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(item => 
        processor(item).catch(error => {
          console.error('Batch processing error:', error);
          return null;
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null));
      
      // Minimal delay between batches
      if (i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  // Optimize prompt generation for faster AI processing
  createOptimizedPrompt(text: string, subject: string, difficulty: string, count: number = 15): string {
    // More concise prompt for faster processing
    return `Generate exactly ${count} high-quality flashcards from this ${subject} content. Focus on key concepts, definitions, and important details.

Content:
${text.slice(0, 6000)} // Limit content size for faster processing

Format as JSON array:
[{"question": "Q", "answer": "A", "topic": "${subject}", "difficulty": "${difficulty}"}]

Requirements:
- Clear, specific questions
- Comprehensive but concise answers
- Cover most important concepts
- No duplicate information`;
  }

  // Cache frequently used computations
  private computationCache = new Map<string, any>();
  
  getCachedComputation<T>(key: string, computation: () => T): T {
    if (this.computationCache.has(key)) {
      return this.computationCache.get(key);
    }
    
    const result = computation();
    this.computationCache.set(key, result);
    
    // Clean cache if it gets too large
    if (this.computationCache.size > 100) {
      const firstKey = this.computationCache.keys().next().value;
      this.computationCache.delete(firstKey);
    }
    
    return result;
  }

  // Optimize file operations
  async optimizeFileOperation<T>(operation: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), 30000)
        )
      ]);
      
      const duration = Date.now() - startTime;
      if (duration > 5000) {
        console.warn(`Slow file operation detected: ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      console.error('File operation failed:', error);
      throw error;
    }
  }
}

export const performanceOptimizer = PerformanceOptimizer.getInstance();