import { Request, Response, NextFunction } from 'express';
import { type SecureRequest } from './security-middleware';

/**
 * Middleware to transform HTML responses and inject nonces
 */
export function htmlTransformMiddleware(req: SecureRequest, res: Response, next: NextFunction) {
  const originalSend = res.send;
  
  res.send = function(body: any) {
    if (typeof body === 'string' && body.includes('{{NONCE}}') && req.nonce) {
      // Replace nonce placeholder with actual nonce
      body = body.replace(/{{NONCE}}/g, req.nonce);
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}