import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import type { FlashcardPair } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// the newest Anthropic model is "claude-sonnet-4-20250514" which was released May 14, 2025. Use this by default unless user has already selected claude-3-7-sonnet-20250219

interface FocusAreas {
  syntax?: boolean;
  dataStructures?: boolean;
  controlFlow?: boolean;
}

export async function generateFlashcards(
  text: string,
  provider: "openai" | "anthropic",
  apiKey: string,
  count: number,
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
        focusAreas,
        difficulty
      );
      
      allFlashcards.push(...chunkFlashcards);
    } catch (error) {
      console.error(`Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks even if one fails
    }
  }
  
  // Ensure we don't exceed the requested count
  return allFlashcards.slice(0, count);
}

async function generateFlashcardsForChunk(
  text: string,
  provider: "openai" | "anthropic",
  apiKey: string,
  count: number,
  focusAreas: FocusAreas,
  difficulty: string
): Promise<FlashcardPair[]> {
  const prompt = createFlashcardPrompt(text, count, focusAreas, difficulty);
  
  if (provider === "openai") {
    return generateWithOpenAI(prompt, apiKey);
  } else {
    return generateWithAnthropic(prompt, apiKey);
  }
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<FlashcardPair[]> {
  const openai = new OpenAI({ apiKey });
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert Python instructor creating educational flashcards. Generate high-quality question-answer pairs focused specifically on Python syntax, code structure, and programming concepts. Always respond with valid JSON in the exact format requested."
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

    const result = JSON.parse(content);
    return validateAndFormatFlashcards(result.flashcards || []);
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(`OpenAI API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateWithAnthropic(prompt: string, apiKey: string): Promise<FlashcardPair[]> {
  const anthropic = new Anthropic({ apiKey });
  
  try {
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

    const result = JSON.parse(content.text);
    return validateAndFormatFlashcards(result.flashcards || []);
  } catch (error) {
    console.error("Anthropic API error:", error);
    throw new Error(`Anthropic API failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function createFlashcardPrompt(
  text: string,
  count: number,
  focusAreas: FocusAreas,
  difficulty: string
): string {
  const focusAreasText = Object.entries(focusAreas)
    .filter(([_, enabled]) => enabled)
    .map(([area, _]) => {
      switch (area) {
        case 'syntax': return 'Python syntax and grammar';
        case 'dataStructures': return 'Data structures (lists, dictionaries, sets, tuples)';
        case 'controlFlow': return 'Control flow (loops, conditionals, exception handling)';
        default: return area;
      }
    })
    .join(', ');

  return `
Analyze the following Python educational content and create exactly ${count} high-quality flashcards for ${difficulty} level learners.

Focus areas: ${focusAreasText || 'General Python syntax and programming concepts'}

Content to analyze:
"""
${text}
"""

Instructions:
1. Create flashcards that test practical Python syntax knowledge
2. Focus on code structure, proper syntax, and common patterns
3. Include code examples in answers when appropriate
4. Make questions specific and testable
5. Ensure answers are concise but complete
6. Use proper Python code formatting in answers
7. Target ${difficulty} difficulty level

Response format (JSON only):
{
  "flashcards": [
    {
      "question": "Clear, specific question about Python syntax or concept",
      "answer": "Concise answer with code example if relevant",
      "topic": "Brief topic category (e.g., 'Functions', 'Lists', 'Loops')",
      "difficulty": "${difficulty}"
    }
  ]
}

Example flashcard:
{
  "question": "What is the correct syntax to define a function that takes two parameters and returns their sum?",
  "answer": "def function_name(param1, param2):\n    return param1 + param2",
  "topic": "Functions",
  "difficulty": "${difficulty}"
}

Generate exactly ${count} flashcards. Focus on practical, testable Python syntax knowledge.
`;
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
