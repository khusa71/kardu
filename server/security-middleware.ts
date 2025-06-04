import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface SecureRequest extends Request {
  nonce?: string;
}

/**
 * Generates a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Enhanced security middleware with proper CSP and nonce support
 */
export function securityMiddleware(req: SecureRequest, res: Response, next: NextFunction) {
  // Generate nonce for this request
  req.nonce = generateNonce();
  
  // Trust proxy settings for Replit deployments
  if (!req.app.get('trust proxy')) {
    req.app.set('trust proxy', 1);
  }
  
  // Force removal of X-Powered-By header early
  res.removeHeader('X-Powered-By');
  req.app.disable('x-powered-by');
  
  // Force HTTPS in production
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === 'true';
  const protocol = req.header('x-forwarded-proto') || 
                  req.header('x-scheme') || 
                  (req.secure ? 'https' : 'http');
  
  if (isProduction && protocol !== 'https') {
    const host = req.header('host') || req.header('x-forwarded-host');
    if (host) {
      return res.redirect(301, `https://${host}${req.url}`);
    }
  }
  
  // Set comprehensive security headers
  setSecurityHeaders(res, req.nonce);
  
  next();
}

/**
 * Sets all required security headers with proper CSP
 */
function setSecurityHeaders(res: Response, nonce: string) {
  // Remove any existing HSTS headers to prevent duplicates
  res.removeHeader('Strict-Transport-Security');
  
  // HSTS - Force HTTPS for 2 years
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS Protection (legacy but still useful)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy - restrict dangerous features
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=(self)',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
    'fullscreen=(self)'
  ].join(', '));
  
  // Content Security Policy without unsafe directives
  const csp = buildSecureCSP(nonce);
  res.setHeader('Content-Security-Policy', csp);
}

/**
 * Builds a secure Content Security Policy with nonce support
 */
function buildSecureCSP(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Base CSP directives
  const baseDirectives = [
    `default-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `manifest-src 'self'`,
    `media-src 'self' data: blob:`
  ];
  
  // Production CSP - strict with nonces only
  const productionDirectives = [
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://checkout.stripe.com`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https: *.stripe.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com wss: ws: https://kardu.io`,
    `frame-src https://js.stripe.com https://checkout.stripe.com`,
    `worker-src 'self' blob:`,
    `upgrade-insecure-requests`
  ];
  
  // Development CSP - slightly relaxed for Vite HMR but still secure
  const developmentDirectives = [
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://checkout.stripe.com https://replit.com 'unsafe-eval'`,
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com 'unsafe-inline'`,
    `img-src 'self' data: blob: https: *.stripe.com *.replit.com`,
    `font-src 'self' data: https://fonts.gstatic.com`,
    `connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com wss: ws: https://kardu.io https://*.replit.dev https://*.replit.app`,
    `frame-src https://js.stripe.com https://checkout.stripe.com`,
    `worker-src 'self' blob:`
  ];
  
  const specificDirectives = isDevelopment ? developmentDirectives : productionDirectives;
  
  return [...baseDirectives, ...specificDirectives].join('; ');
}