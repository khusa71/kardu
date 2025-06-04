import { Request, Response, NextFunction } from 'express';

interface ApiKeyValidationResult {
  hasOpenAI: boolean;
  hasAnthropic: boolean;
  availableProviders: ('openai' | 'anthropic')[];
  canProcess: boolean;
}

/**
 * Validates that required API keys are available for AI processing
 * Checks both OpenAI and Anthropic API keys and determines available providers
 */
export function validateApiKeys(): ApiKeyValidationResult {
  const hasOpenAI = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
  const hasAnthropic = !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
  
  const availableProviders: ('openai' | 'anthropic')[] = [];
  if (hasOpenAI) availableProviders.push('openai');
  if (hasAnthropic) availableProviders.push('anthropic');
  
  return {
    hasOpenAI,
    hasAnthropic,
    availableProviders,
    canProcess: availableProviders.length > 0
  };
}

/**
 * Middleware to check API key availability before processing requests
 * Returns 503 error if no API keys are configured
 */
export function requireApiKeys(req: Request, res: Response, next: NextFunction) {
  const validation = validateApiKeys();
  
  if (!validation.canProcess) {
    return res.status(503).json({
      message: "AI services are temporarily unavailable. No API keys configured.",
      error: "missing_api_keys",
      availableProviders: validation.availableProviders
    });
  }
  
  // Add validation result to request for use in downstream handlers
  (req as any).apiKeyValidation = validation;
  next();
}

/**
 * Gets the best available provider based on preference and availability
 * Falls back to available provider if requested one is not available
 */
export function getAvailableProvider(
  requestedProvider: string, 
  validation: ApiKeyValidationResult
): 'openai' | 'anthropic' | null {
  // If requested provider is available, use it
  if (validation.availableProviders.includes(requestedProvider as 'openai' | 'anthropic')) {
    return requestedProvider as 'openai' | 'anthropic';
  }
  
  // Fallback to any available provider
  if (validation.availableProviders.length > 0) {
    return validation.availableProviders[0];
  }
  
  return null;
}

/**
 * Logs API key configuration status on server startup
 */
export function logApiKeyStatus() {
  const validation = validateApiKeys();
  console.log('🔑 API Key Configuration:');
  console.log(`  OpenAI: ${validation.hasOpenAI ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Anthropic: ${validation.hasAnthropic ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Available providers: [${validation.availableProviders.join(', ')}]`);
  
  if (!validation.canProcess) {
    console.warn('⚠️  WARNING: No AI API keys configured. Flashcard generation will fail.');
    console.warn('   Please set OPENAI_API_KEY and/or ANTHROPIC_API_KEY environment variables.');
  }
}