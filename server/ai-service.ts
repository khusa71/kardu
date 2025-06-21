import OpenAI from "openai";
import type { FlashcardPair } from "@shared/schema";
import { performanceOptimizer } from './performance-optimizer';

// Using OpenRouter for unified AI access

interface FocusAreas {
  concepts?: boolean;
  definitions?: boolean;
  examples?: boolean;
  procedures?: boolean;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

interface ApiError extends Error {
  type: 'rate_limit' | 'api_error' | 'network_error' | 'invalid_response' | 'quota_exceeded';
  statusCode?: number;
  retryable: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  baseDelay: 500,
  maxDelay: 3000
};

/**
 * Categorizes API errors and determines if they are retryable
 */
function categorizeError(error: any, provider: string): ApiError {
  const apiError = error as ApiError;
  apiError.retryable = false;

  if (error?.status || error?.statusCode) {
    const status = error.status || error.statusCode;
    
    switch (status) {
      case 429:
        apiError.type = 'rate_limit';
        apiError.retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        apiError.type = 'api_error';
        apiError.retryable = true;
        break;
      case 402:
        apiError.type = 'quota_exceeded';
        apiError.retryable = false;
        break;
      default:
        apiError.type = 'api_error';
        apiError.retryable = false;
    }
    apiError.statusCode = status;
  } else if (error?.code === 'ECONNRESET' || error?.code === 'ENOTFOUND') {
    apiError.type = 'network_error';
    apiError.retryable = true;
  } else {
    apiError.type = 'invalid_response';
    apiError.retryable = false;
  }

  return apiError;
}

/**
 * Implements exponential backoff retry logic
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  provider: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: ApiError;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = categorizeError(error, provider);
      
      console.error(`${provider} API attempt ${attempt + 1} failed:`, {
        type: lastError.type,
        statusCode: lastError.statusCode,
        message: lastError.message
      });
      
      // Don't retry on final attempt or non-retryable errors
      if (attempt === config.maxRetries || !lastError.retryable) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
      );
      
      console.log(`Retrying ${provider} API in ${delay}ms (attempt ${attempt + 2}/${config.maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

export async function generateFlashcards(
  text: string,
  model: string,
  apiKey: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string,
  customContext?: string
): Promise<FlashcardPair[]> {
  try {
    console.log(`Attempting flashcard generation with model: ${model}`);
    return await generateFlashcardsWithOpenRouter(text, model, apiKey, count, subject, focusAreas, difficulty, customContext);
  } catch (error) {
    const apiError = categorizeError(error, 'openrouter');
    console.error(`OpenRouter API failed:`, apiError.type, apiError.message);
    throw apiError;
  }
}

async function generateFlashcardsWithOpenRouter(
  text: string,
  model: string,
  apiKey: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string,
  customContext?: string
): Promise<FlashcardPair[]> {
  const chunks = chunkText(text, 8000);
  const allFlashcards: FlashcardPair[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const currentChunkCount = Math.ceil(count / chunks.length);
    
    try {
      const chunkFlashcards = await generateFlashcardsForChunk(
        chunk,
        model,
        apiKey,
        currentChunkCount,
        subject,
        focusAreas,
        difficulty,
        customContext
      );
      
      allFlashcards.push(...chunkFlashcards);
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      if (i === 0) {
        throw error;
      }
    }
  }
  
  if (allFlashcards.length === 0) {
    throw new Error(`Failed to generate any flashcards`);
  }
  
  const finalFlashcards = allFlashcards.slice(0, count);
  
  return finalFlashcards.map((card: any) => ({
    front: card.question || card.front,
    back: card.answer || card.back,
    subject: card.topic || card.subject || subject,
    difficulty: difficulty as "beginner" | "intermediate" | "advanced"
  }));
}

async function generateFlashcardsForChunk(
  text: string,
  model: string,
  apiKey: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string,
  customContext?: string
): Promise<FlashcardPair[]> {
  const prompt = createFlashcardPrompt(text, count, subject, focusAreas, difficulty, customContext);
  return generateWithOpenRouter(prompt, model, apiKey);
}

async function generateWithOpenRouter(prompt: string, model: string, apiKey: string): Promise<FlashcardPair[]> {
  const openai = new OpenAI({ 
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1"
  });

  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are an expert educator creating high-quality flashcards. Always respond with valid JSON containing an array of flashcard objects."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from API");
    }

    // Implement comprehensive JSON extraction and parsing
    let jsonContent = content.trim();
    
    // Method 1: Extract from markdown code blocks
    const markdownMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (markdownMatch) {
      jsonContent = markdownMatch[1].trim();
    }
    
    // Method 2: Clean up any remaining markdown artifacts
    jsonContent = jsonContent
      .replace(/^```json\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^```\s*/i, '')
      .trim();
    
    // Method 3: Handle cases where JSON is embedded in text
    const embeddedJsonMatch = jsonContent.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (embeddedJsonMatch && !jsonContent.startsWith('[') && !jsonContent.startsWith('{')) {
      jsonContent = embeddedJsonMatch[1];
    }
    
    try {
      const parsed = JSON.parse(jsonContent);
      const flashcards = Array.isArray(parsed) ? parsed : parsed.flashcards || [];
      
      if (!Array.isArray(flashcards) || flashcards.length === 0) {
        console.error("No valid flashcards found in response");
        throw new Error("No valid flashcards in API response");
      }
      
      return validateAndFormatFlashcards(flashcards);
    } catch (parseError: any) {
      console.error("Comprehensive JSON parsing failed");
      console.error("Parse error:", parseError?.message || parseError);
      console.error("Content attempted:", jsonContent.substring(0, 500));
      console.error("Original response:", content.substring(0, 500));
      throw new Error("Invalid JSON response from API");
    }
  }, 'openrouter');
}

function createFlashcardPrompt(
  text: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string,
  customContext?: string
): string {
  const subjectContext = getSubjectContext(subject);
  const focusText = Object.entries(focusAreas)
    .filter(([_, enabled]) => enabled)
    .map(([area]) => area)
    .join(", ");

  let prompt = `Create exactly ${count} high-quality flashcards from the following ${subject} content.

${subjectContext}

**Content to process:**
${text}

**Requirements:**
- Generate exactly ${count} flashcards
- Difficulty level: ${difficulty}
- Focus areas: ${focusText || "all aspects"}
- Questions should be clear and specific
- Answers should be comprehensive but concise
- Include examples where appropriate
- Use proper formatting and terminology for ${subject}`;

  if (customContext) {
    prompt += `\n- Additional context: ${customContext}`;
  }

  prompt += `

**Response format (JSON only):**
[
  {
    "question": "Clear, specific question here",
    "answer": "Comprehensive but concise answer here",
    "topic": "${subject}",
    "difficulty": "${difficulty}"
  }
]`;

  return prompt;
}

function getSubjectContext(subject: string) {
  const contexts: Record<string, string> = {
    "Mathematics": "Focus on key theorems, formulas, problem-solving steps, and mathematical concepts. Include worked examples where helpful.",
    "Science": "Emphasize scientific principles, processes, key terms, and cause-effect relationships. Include experimental details where relevant.",
    "History": "Focus on dates, events, key figures, causes and consequences, and historical significance.",
    "Language": "Include vocabulary, grammar rules, sentence structures, and cultural context where applicable.",
    "Medicine": "Focus on symptoms, diagnoses, treatments, anatomical structures, and physiological processes.",
    "Law": "Emphasize legal principles, case law, statutes, legal procedures, and key terminology.",
    "Business": "Focus on concepts, strategies, case studies, financial principles, and management practices.",
    "Literature": "Include themes, literary devices, character analysis, plot elements, and historical context.",
    "Computer Science": "Focus on algorithms, data structures, programming concepts, and system design principles.",
    "General": "Create well-structured questions covering key concepts, definitions, and important details."
  };

  return contexts[subject] || contexts["General"];
}

function validateAndFormatFlashcards(flashcards: any[]): FlashcardPair[] {
  if (!Array.isArray(flashcards)) {
    throw new Error("Response must be an array of flashcards");
  }

  try {
    const filtered = flashcards.filter(card => card && (card.question || card.front) && (card.answer || card.back));
    
    const mapped = filtered.map(card => ({
      front: String(card.question || card.front || "").trim(),
      back: String(card.answer || card.back || "").trim(),
      subject: String(card.topic || card.subject || "General").trim(),
      difficulty: (card.difficulty || "intermediate") as "beginner" | "intermediate" | "advanced"
    }));
    
    const final = mapped.filter(card => card.front.length > 0 && card.back.length > 0);
    
    return final;
  } catch (error) {
    throw error;
  }
}

function chunkText(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        // Sentence is too long, split by words
        const words = trimmedSentence.split(' ');
        let wordChunk = "";
        for (const word of words) {
          if (wordChunk.length + word.length + 1 > maxChunkSize) {
            if (wordChunk) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              chunks.push(word);
            }
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}