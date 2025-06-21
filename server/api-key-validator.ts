import { Request, Response, NextFunction } from 'express';

interface ApiKeyValidationResult {
  hasOpenRouter: boolean;
  availableProviders: string[];
  canProcess: boolean;
}

/**
 * Validates that required API keys are available for AI processing
 * Checks OpenRouter API key and determines available models
 */
export function validateApiKeys(): ApiKeyValidationResult {
  const hasOpenRouter = !!(process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim());
  
  const availableProviders: string[] = [];
  if (hasOpenRouter) {
    availableProviders.push('openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct');
  }
  
  return {
    hasOpenRouter,
    availableProviders,
    canProcess: hasOpenRouter
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
  requestedModel: string, 
  validation: ApiKeyValidationResult
): string | null {
  // If requested model is available, use it
  if (validation.availableProviders.includes(requestedModel)) {
    return requestedModel;
  }
  
  // Fallback to any available model
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
  console.log(`  OpenRouter: ${validation.hasOpenRouter ? '✅ Configured' : '❌ Missing'}`);
  console.log(`  Available models: [${validation.availableProviders.join(', ')}]`);
}