import { FlashcardPair } from '../shared/schema';

export interface ContentChunk {
  text: string;
  priority: number;
  section: string;
  wordCount: number;
  relevanceScore: number;
}

export interface PreprocessingResult {
  chunks: ContentChunk[];
  totalTokens: number;
  estimatedCost: number;
  filteredContent: string;
}

export class PreprocessingService {
  // Optimized content filtering for faster processing
  filterRelevantContent(text: string, subject: string): string {
    // Use regex for faster line processing
    const lines = text.split('\n');
    const relevantLines: string[] = [];
    
    // Pre-compiled regex patterns for faster matching
    const pageNumberRegex = /^\s*\d+\s*$/;
    const headerFooterRegex = /^(page|chapter|\d+\s*of\s*\d+|©|copyright)/i;
    const definitionRegex = /(:|\bdefinition\b|\bis\s+defined\s+as\b|\bmeans\b)/i;
    const exampleRegex = /(\bexample\b|\bfor\s+instance\b|\bsuch\s+as\b|\be\.g\b)/i;
    
    // Subject-specific keywords (cached for performance)
    const subjectKeywords = this.getSubjectKeywords(subject);
    
    for (const line of lines) {
      const cleanLine = line.trim();
      
      // Skip processing very short lines or obvious noise
      if (cleanLine.length < 15) continue;
      if (pageNumberRegex.test(cleanLine)) continue;
      if (headerFooterRegex.test(cleanLine)) continue;
      
      // Fast relevance check
      const hasKeywords = subjectKeywords.some(keyword => 
        cleanLine.toLowerCase().includes(keyword.toLowerCase())
      );
      
      const isDefinition = definitionRegex.test(cleanLine);
      const isExample = exampleRegex.test(cleanLine);
      
      if (hasKeywords || isDefinition || isExample) {
        relevantLines.push(cleanLine);
      }
    }
    
    return relevantLines.join('\n');
  }

  // Smart chunking that preserves context
  intelligentChunk(text: string, maxChunkSize: number = 4000): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const sections = this.splitIntoSections(text);
    
    for (const section of sections) {
      if (section.text.length <= maxChunkSize) {
        chunks.push(section);
      } else {
        // Split large sections while preserving context
        const subChunks = this.splitLargeSection(section, maxChunkSize);
        chunks.push(...subChunks);
      }
    }
    
    // Sort by priority and relevance
    return chunks.sort((a, b) => b.priority - a.priority || b.relevanceScore - a.relevanceScore);
  }

  // Estimate processing cost to optimize LLM usage
  estimateProcessingCost(chunks: ContentChunk[], provider: string): number {
    const totalTokens = chunks.reduce((sum, chunk) => sum + this.estimateTokens(chunk.text), 0);
    
    // Cost per 1K tokens (approximate)
    const costPer1K = provider === 'openai' ? 0.03 : 0.015; // Anthropic is cheaper
    
    return (totalTokens / 1000) * costPer1K;
  }

  // Batch multiple chunks for efficient processing
  createOptimalBatches(chunks: ContentChunk[], maxBatchSize: number = 3): ContentChunk[][] {
    const batches: ContentChunk[][] = [];
    let currentBatch: ContentChunk[] = [];
    let currentBatchTokens = 0;
    
    for (const chunk of chunks) {
      const chunkTokens = this.estimateTokens(chunk.text);
      
      if (currentBatch.length >= maxBatchSize || currentBatchTokens + chunkTokens > 6000) {
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [];
          currentBatchTokens = 0;
        }
      }
      
      currentBatch.push(chunk);
      currentBatchTokens += chunkTokens;
    }
    
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  }

  // Preprocess content for optimal LLM usage
  preprocessContent(text: string, subject: string): PreprocessingResult {
    // Step 1: Filter relevant content
    const filteredContent = this.filterRelevantContent(text, subject);
    
    // Step 2: Create intelligent chunks
    const chunks = this.intelligentChunk(filteredContent);
    
    // Step 3: Calculate metrics
    const totalTokens = chunks.reduce((sum, chunk) => sum + this.estimateTokens(chunk.text), 0);
    const estimatedCost = this.estimateProcessingCost(chunks, 'anthropic');
    
    return {
      chunks,
      totalTokens,
      estimatedCost,
      filteredContent
    };
  }

  private getSubjectKeywords(subject: string): string[] {
    const keywordMap: Record<string, string[]> = {
      programming: ['function', 'variable', 'class', 'method', 'algorithm', 'syntax', 'code', 'programming', 'software'],
      mathematics: ['theorem', 'formula', 'equation', 'proof', 'calculate', 'solve', 'mathematics', 'math', 'number'],
      science: ['experiment', 'hypothesis', 'theory', 'observation', 'research', 'study', 'analysis', 'science'],
      medicine: ['patient', 'treatment', 'diagnosis', 'symptoms', 'medical', 'health', 'disease', 'therapy'],
      business: ['strategy', 'market', 'profit', 'business', 'management', 'finance', 'customer', 'revenue'],
      history: ['historical', 'century', 'period', 'event', 'civilization', 'culture', 'society', 'politics'],
      language: ['grammar', 'vocabulary', 'language', 'literature', 'writing', 'reading', 'linguistic'],
      law: ['legal', 'court', 'law', 'statute', 'regulation', 'case', 'justice', 'attorney'],
      psychology: ['behavior', 'mind', 'cognitive', 'psychology', 'mental', 'brain', 'emotion', 'therapy'],
      general: ['concept', 'principle', 'theory', 'example', 'definition', 'important', 'key', 'main']
    };
    
    return keywordMap[subject] || keywordMap.general;
  }

  private calculateRelevanceScore(text: string, keywords: string[]): number {
    const lowerText = text.toLowerCase();
    let score = 0;
    
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    }
    
    // Bonus for educational indicators
    if (lowerText.includes('definition') || lowerText.includes('define')) score += 0.3;
    if (lowerText.includes('example') || lowerText.includes('for instance')) score += 0.2;
    if (lowerText.includes('important') || lowerText.includes('key')) score += 0.2;
    if (lowerText.includes('note:') || lowerText.includes('remember:')) score += 0.3;
    
    return Math.min(score, 1.0);
  }

  private splitIntoSections(text: string): ContentChunk[] {
    const sections: ContentChunk[] = [];
    const paragraphs = text.split('\n\n');
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      if (paragraph.length < 50) continue;
      
      const wordCount = paragraph.split(' ').length;
      const priority = this.calculatePriority(paragraph);
      const relevanceScore = this.calculateRelevanceScore(paragraph, []);
      
      sections.push({
        text: paragraph,
        priority,
        section: `Section ${i + 1}`,
        wordCount,
        relevanceScore
      });
    }
    
    return sections;
  }

  private splitLargeSection(section: ContentChunk, maxSize: number): ContentChunk[] {
    const chunks: ContentChunk[] = [];
    const sentences = section.text.split(/[.!?]+/);
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
        chunks.push({
          ...section,
          text: currentChunk.trim(),
          wordCount: currentChunk.split(' ').length
        });
        currentChunk = sentence;
      } else {
        currentChunk += sentence + '.';
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push({
        ...section,
        text: currentChunk.trim(),
        wordCount: currentChunk.split(' ').length
      });
    }
    
    return chunks;
  }

  private calculatePriority(text: string): number {
    let priority = 0.5; // Base priority
    
    // Higher priority for definitions, examples, key concepts
    if (text.toLowerCase().includes('definition')) priority += 0.3;
    if (text.toLowerCase().includes('example')) priority += 0.2;
    if (text.toLowerCase().includes('important')) priority += 0.2;
    if (text.toLowerCase().includes('key concept')) priority += 0.3;
    if (text.toLowerCase().includes('note:')) priority += 0.2;
    
    return Math.min(priority, 1.0);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  private isPageNumber(text: string): boolean {
    return /^\s*\d+\s*$/.test(text) || /^page\s+\d+/i.test(text);
  }

  private isHeaderFooter(text: string): boolean {
    return text.length < 50 && (
      text.toLowerCase().includes('chapter') ||
      text.toLowerCase().includes('section') ||
      /^\d+\.\d+/.test(text)
    );
  }

  private isDefinition(text: string): boolean {
    const lowerText = text.toLowerCase();
    return lowerText.includes('definition:') || 
           lowerText.includes('define:') || 
           lowerText.includes('is defined as') ||
           lowerText.includes('refers to');
  }

  private isExample(text: string): boolean {
    const lowerText = text.toLowerCase();
    return lowerText.includes('example:') ||
           lowerText.includes('for example') ||
           lowerText.includes('for instance') ||
           lowerText.includes('such as');
  }
}

export const preprocessingService = new PreprocessingService();