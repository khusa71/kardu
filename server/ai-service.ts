import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import type { FlashcardPair } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219

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
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000
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
  } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
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
  provider: "openai" | "anthropic",
  apiKey: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string
): Promise<FlashcardPair[]> {
  // Try primary provider first, fallback to alternative if available
  const primaryProvider = provider;
  const fallbackProvider = provider === "openai" ? "anthropic" : "openai";
  const fallbackApiKey = fallbackProvider === "openai" 
    ? process.env.OPENAI_API_KEY 
    : process.env.ANTHROPIC_API_KEY;

  let lastError: ApiError;
  
  // Try primary provider
  try {
    console.log(`Attempting flashcard generation with ${primaryProvider}`);
    return await generateFlashcardsWithProvider(text, primaryProvider, apiKey, count, subject, focusAreas, difficulty);
  } catch (error) {
    lastError = categorizeError(error, primaryProvider);
    console.error(`${primaryProvider} failed:`, lastError.type, lastError.message);
    
    // Only attempt fallback if we have the API key and error suggests provider issue
    if (fallbackApiKey && (lastError.type === 'rate_limit' || lastError.type === 'quota_exceeded' || lastError.type === 'api_error')) {
      try {
        console.log(`Attempting fallback to ${fallbackProvider}`);
        return await generateFlashcardsWithProvider(text, fallbackProvider, fallbackApiKey, count, subject, focusAreas, difficulty);
      } catch (fallbackError) {
        const categorizedFallbackError = categorizeError(fallbackError, fallbackProvider);
        console.error(`${fallbackProvider} fallback also failed:`, categorizedFallbackError.type, categorizedFallbackError.message);
        
        // Throw the more informative error
        throw new Error(`Both AI providers failed. Primary (${primaryProvider}): ${lastError.message}. Fallback (${fallbackProvider}): ${categorizedFallbackError.message}`);
      }
    }
    
    // Re-throw original error if no fallback available
    throw lastError;
  }
}

async function generateFlashcardsWithProvider(
  text: string,
  provider: "openai" | "anthropic",
  apiKey: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string
): Promise<FlashcardPair[]> {
  // Chunk the text if it's too large
  const chunks = chunkText(text, 8000); // Conservative chunk size
  const flashcardsPerChunk = Math.ceil(count / chunks.length);
  
  let allFlashcards: FlashcardPair[] = [];
  
  for (let i = 0; i < chunks.length && allFlashcards.length < count; i++) {
    const chunk = chunks[i];
    const remainingCount = count - allFlashcards.length;
    const currentChunkCount = Math.min(flashcardsPerChunk, remainingCount);
    
    try {
      const chunkFlashcards = await generateFlashcardsForChunk(
        chunk,
        provider,
        apiKey,
        currentChunkCount,
        subject,
        focusAreas,
        difficulty
      );
      
      allFlashcards.push(...chunkFlashcards);
    } catch (error) {
      console.error(`Error processing chunk ${i + 1} with ${provider}:`, error);
      // Continue with other chunks even if one fails, but track the error
      if (i === 0) {
        // If the first chunk fails, this might be a systematic issue
        throw error;
      }
    }
  }
  
  // Ensure we have at least some flashcards
  if (allFlashcards.length === 0) {
    throw new Error(`Failed to generate any flashcards with ${provider}`);
  }
  
  // Ensure we have exactly the requested count and add metadata
  const finalFlashcards = allFlashcards.slice(0, count);
  
  return finalFlashcards.map(card => ({
    question: card.question,
    answer: card.answer,
    topic: card.topic || subject,
    difficulty: difficulty as "beginner" | "intermediate" | "advanced"
  }));
}

async function generateFlashcardsForChunk(
  text: string,
  provider: "openai" | "anthropic",
  apiKey: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string
): Promise<FlashcardPair[]> {
  const prompt = createFlashcardPrompt(text, count, subject, focusAreas, difficulty);
  
  if (provider === "openai") {
    return generateWithOpenAI(prompt, apiKey);
  } else {
    return generateWithAnthropic(prompt, apiKey);
  }
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<FlashcardPair[]> {
  const openai = new OpenAI({ apiKey });
  
  return await withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator specializing in creating precise, subject-specific flashcards. You must follow the exact count, difficulty level, and subject requirements provided. Always respond with valid JSON containing exactly the requested number of flashcards."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    // Clean the response text to handle markdown code blocks
    let cleanedText = content.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const result = JSON.parse(cleanedText);
    return validateAndFormatFlashcards(result.flashcards || []);
  }, "openai");
}

async function generateWithAnthropic(prompt: string, apiKey: string): Promise<FlashcardPair[]> {
  const anthropic = new Anthropic({ apiKey });
  
  return await withRetry(async () => {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      system: "You are an expert Python instructor creating educational flashcards. Generate high-quality question-answer pairs focused specifically on Python syntax, code structure, and programming concepts. Always respond with valid JSON in the exact format requested.",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error("Unexpected response format from Anthropic");
    }

    // Clean the response text to handle markdown code blocks
    let cleanedText = content.text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const result = JSON.parse(cleanedText);
    return validateAndFormatFlashcards(result.flashcards || []);
  }, "anthropic");
}

function createFlashcardPrompt(
  text: string,
  count: number,
  subject: string,
  focusAreas: FocusAreas,
  difficulty: string
): string {
  const focusAreasText = Object.entries(focusAreas)
    .filter(([_, enabled]) => enabled)
    .map(([area, _]) => {
      switch (area) {
        case 'concepts': return 'Key concepts and theories';
        case 'definitions': return 'Definitions and terminology';
        case 'examples': return 'Examples and case studies';
        case 'procedures': return 'Procedures and methods';
        default: return area;
      }
    })
    .join(', ');

  const subjectContext = getSubjectContext(subject);

  return `
STRICT REQUIREMENTS:
- Generate EXACTLY ${count} flashcards, no more, no less
- Subject: ${subjectContext.name}
- Difficulty: ${difficulty} level
- Focus areas: ${focusAreasText || 'General concepts and knowledge'}

Content to analyze:
"""
${text}
"""

DIFFICULTY LEVEL GUIDELINES:
${difficulty === 'beginner' ? 
  '- Use simple, clear language and basic concepts\n- Focus on definitions and fundamental principles\n- Avoid complex terminology' :
  difficulty === 'intermediate' ?
  '- Include moderate complexity and some technical terms\n- Combine multiple concepts in questions\n- Require some analysis and application' :
  '- Use advanced terminology and complex concepts\n- Require synthesis and critical thinking\n- Include edge cases and nuanced scenarios'
}

SUBJECT-SPECIFIC FOCUS (${subjectContext.name}):
1. Create flashcards that test ${subjectContext.testingFocus}
2. Focus on ${subjectContext.contentFocus}
3. ${subjectContext.answerStyle}
4. Use ${subjectContext.name}-specific terminology and examples
5. Ensure practical applicability in ${subjectContext.name}

CRITICAL: Return EXACTLY ${count} flashcards in valid JSON format:
{
  "flashcards": [
    {
      "question": "Specific ${difficulty}-level question about ${subjectContext.name}",
      "answer": "Complete answer with ${subjectContext.name} context",
      "topic": "${subjectContext.name} topic area",
      "difficulty": "${difficulty}"
    }
  ]
}

COUNT VERIFICATION: The JSON response must contain exactly ${count} flashcard objects.
`;
}

function getSubjectContext(subject: string) {
  const contexts = {
    programming: {
      name: "Programming & Computer Science",
      testingFocus: "practical coding knowledge and programming concepts",
      contentFocus: "code structure, syntax, algorithms, and programming patterns",
      answerStyle: "Include code examples in answers when appropriate",
      example: `{
  "question": "What is the correct syntax to define a function that takes two parameters and returns their sum?",
  "answer": "def function_name(param1, param2):\\n    return param1 + param2",
  "topic": "Functions",
  "difficulty": "intermediate"
}`
    },
    mathematics: {
      name: "Mathematics & Statistics",
      testingFocus: "mathematical concepts, formulas, and problem-solving techniques",
      contentFocus: "theorems, definitions, formulas, and mathematical reasoning",
      answerStyle: "Include mathematical notation and step-by-step explanations when relevant",
      example: `{
  "question": "What is the quadratic formula and when is it used?",
  "answer": "x = (-b ± √(b² - 4ac)) / 2a\\nUsed to find the roots of quadratic equations ax² + bx + c = 0",
  "topic": "Quadratic Equations",
  "difficulty": "intermediate"
}`
    },
    science: {
      name: "Science & Engineering",
      testingFocus: "scientific principles, processes, and engineering concepts",
      contentFocus: "theories, laws, experimental procedures, and applications",
      answerStyle: "Include scientific explanations and real-world applications",
      example: `{
  "question": "What is Newton's second law of motion?",
  "answer": "F = ma\\nThe acceleration of an object is directly proportional to the net force acting on it and inversely proportional to its mass",
  "topic": "Classical Mechanics",
  "difficulty": "intermediate"
}`
    },
    medicine: {
      name: "Medicine & Health Sciences",
      testingFocus: "medical knowledge, anatomy, diseases, and treatments",
      contentFocus: "anatomical structures, physiological processes, pathology, and clinical applications",
      answerStyle: "Include clinical relevance and medical terminology",
      example: `{
  "question": "What are the main functions of the liver?",
  "answer": "1. Detoxification of blood\\n2. Protein synthesis\\n3. Bile production\\n4. Glucose metabolism\\n5. Storage of vitamins and minerals",
  "topic": "Hepatology",
  "difficulty": "intermediate"
}`
    },
    business: {
      name: "Business & Economics",
      testingFocus: "business concepts, economic principles, and management strategies",
      contentFocus: "theories, models, case studies, and practical applications",
      answerStyle: "Include real-world business examples and economic implications",
      example: `{
  "question": "What is the difference between fixed costs and variable costs?",
  "answer": "Fixed costs remain constant regardless of production volume (rent, salaries)\\nVariable costs change with production volume (materials, labor per unit)",
  "topic": "Cost Analysis",
  "difficulty": "intermediate"
}`
    },
    history: {
      name: "History & Social Studies",
      testingFocus: "historical events, social movements, and cultural developments",
      contentFocus: "dates, causes and effects, key figures, and historical context",
      answerStyle: "Include historical context and significance",
      example: `{
  "question": "What were the main causes of World War I?",
  "answer": "1. Militarism and arms race\\n2. Alliance system\\n3. Imperialism\\n4. Nationalism\\n5. Assassination of Archduke Franz Ferdinand (immediate trigger)",
  "topic": "World War I",
  "difficulty": "intermediate"
}`
    },
    language: {
      name: "Language & Literature",
      testingFocus: "language skills, literary analysis, and linguistic concepts",
      contentFocus: "grammar, vocabulary, literary devices, and cultural context",
      answerStyle: "Include examples from literature and proper linguistic terminology",
      example: `{
  "question": "What is a metaphor and how does it differ from a simile?",
  "answer": "A metaphor directly compares two things without using 'like' or 'as' (Life is a journey)\\nA simile uses 'like' or 'as' to compare (Life is like a journey)",
  "topic": "Literary Devices",
  "difficulty": "intermediate"
}`
    },
    law: {
      name: "Law & Legal Studies",
      testingFocus: "legal principles, case law, and procedural knowledge",
      contentFocus: "statutes, precedents, legal reasoning, and practical applications",
      answerStyle: "Include legal terminology and cite relevant cases or statutes when appropriate",
      example: `{
  "question": "What is the doctrine of stare decisis?",
  "answer": "The legal principle that courts should follow precedents set by previous decisions\\nLiterally means 'to stand by things decided'\\nProvides consistency and predictability in legal decisions",
  "topic": "Legal Precedent",
  "difficulty": "intermediate"
}`
    },
    psychology: {
      name: "Psychology & Behavioral Sciences",
      testingFocus: "psychological theories, research methods, and behavioral patterns",
      contentFocus: "theories, experiments, cognitive processes, and applications",
      answerStyle: "Include research findings and psychological terminology",
      example: `{
  "question": "What is classical conditioning?",
  "answer": "A learning process where a neutral stimulus becomes associated with a meaningful stimulus\\nExample: Pavlov's dogs learned to salivate at the sound of a bell paired with food",
  "topic": "Learning Theory",
  "difficulty": "intermediate"
}`
    },
    general: {
      name: "General Education",
      testingFocus: "broad educational concepts and interdisciplinary knowledge",
      contentFocus: "key facts, concepts, and connections across disciplines",
      answerStyle: "Include clear explanations and relevant examples",
      example: `{
  "question": "What is the scientific method?",
  "answer": "1. Observation\\n2. Question\\n3. Hypothesis\\n4. Experiment\\n5. Analysis\\n6. Conclusion\\nA systematic approach to understanding the natural world",
  "topic": "Scientific Inquiry",
  "difficulty": "intermediate"
}`
    }
  };

  return contexts[subject as keyof typeof contexts] || contexts.general;
}

function validateAndFormatFlashcards(flashcards: any[]): FlashcardPair[] {
  const validFlashcards: FlashcardPair[] = [];
  
  for (const card of flashcards) {
    if (
      typeof card.question === 'string' &&
      typeof card.answer === 'string' &&
      card.question.trim() &&
      card.answer.trim()
    ) {
      validFlashcards.push({
        question: card.question.trim(),
        answer: card.answer.trim(),
        topic: typeof card.topic === 'string' ? card.topic.trim() : undefined,
        difficulty: typeof card.difficulty === 'string' ? 
          card.difficulty as 'beginner' | 'intermediate' | 'advanced' : 
          undefined
      });
    }
  }
  
  if (validFlashcards.length === 0) {
    throw new Error("No valid flashcards were generated");
  }
  
  return validFlashcards;
}

function chunkText(text: string, maxChunkSize: number): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit, start a new chunk
    if (currentChunk.length + paragraph.length + 2 > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // If we still have chunks that are too large, split them more aggressively
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChunkSize) {
      finalChunks.push(chunk);
    } else {
      // Split by sentences or lines
      const sentences = chunk.split(/[.!?]\s+/);
      let sentenceChunk = '';
      
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > maxChunkSize && sentenceChunk.length > 0) {
          finalChunks.push(sentenceChunk.trim());
          sentenceChunk = sentence;
        } else {
          sentenceChunk += (sentenceChunk ? '. ' : '') + sentence;
        }
      }
      
      if (sentenceChunk.trim()) {
        finalChunks.push(sentenceChunk.trim());
      }
    }
  }
  
  return finalChunks.length > 0 ? finalChunks : [text.substring(0, maxChunkSize)];
}
