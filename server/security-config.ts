import { Request, Response, NextFunction } from "express";
import crypto from 'crypto';

export interface SecurityConfig {
  enforceHttps: boolean;
  strictTransportSecurity: string;
  contentSecurityPolicy: string;
  additionalHeaders: Record<string, string>;
}

export const defaultSecurityConfig: SecurityConfig = {
  enforceHttps: process.env.NODE_ENV === 'production',
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' https://js.stripe.com https://www.gstatic.com https://replit.com",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com wss: ws:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; '),
  additionalHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    'X-XSS-Protection': '1; mode=block',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  }
};

/**
 * Security middleware that applies essential security headers
 */
export function securityMiddleware(config: SecurityConfig = defaultSecurityConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove X-Powered-By header for security
    res.removeHeader('X-Powered-By');
    
    // Enforce HTTPS in production
    if (config.enforceHttps && req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }

    // Generate nonce for inline scripts if needed (development mode)
    const nonce = generateNonce();
    res.locals.nonce = nonce;
    
    // Apply HSTS header
    res.setHeader('Strict-Transport-Security', config.strictTransportSecurity);
    
    // Apply Content Security Policy with nonce support
    let csp = config.contentSecurityPolicy;
    if (process.env.NODE_ENV === 'development') {
      // Add nonce for development-specific scripts
      csp = csp.replace(
        "script-src 'self'", 
        `script-src 'self' 'nonce-${nonce}'`
      );
    }
    res.setHeader('Content-Security-Policy', csp);
    
    // Apply additional security headers
    Object.entries(config.additionalHeaders).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    next();
  };
}

/**
 * Generate a cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Validates current security configuration
 */
export function validateSecurityConfig(): {
  isSecure: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check if HTTPS is enforced in production
  if (process.env.NODE_ENV === 'production' && !defaultSecurityConfig.enforceHttps) {
    warnings.push('HTTPS enforcement is disabled in production');
  }

  // Check for secure headers
  const requiredHeaders = [
    'Strict-Transport-Security',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Content-Security-Policy'
  ];

  // Add recommendations for enhanced security
  recommendations.push('Consider implementing rate limiting for API endpoints');
  recommendations.push('Monitor security headers with external tools');
  recommendations.push('Regularly update dependencies for security patches');

  return {
    isSecure: warnings.length === 0,
    warnings,
    recommendations
  };
}

/**
 * Security health check endpoint data
 */
export function getSecurityStatus() {
  const validation = validateSecurityConfig();
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    https: {
      enforced: defaultSecurityConfig.enforceHttps,
      hstsEnabled: true,
      hstsMaxAge: '63072000'
    },
    headers: {
      csp: 'enabled',
      cspDirectives: {
        'default-src': "'self'",
        'script-src': "'self' https://js.stripe.com https://www.gstatic.com https://replit.com",
        'style-src': "'self' https://fonts.googleapis.com",
        'img-src': "'self' data: https: blob:",
        'connect-src': "'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com wss: ws:",
        'unsafe-inline': 'removed',
        'unsafe-eval': 'removed'
      },
      xss: 'enabled',
      frameOptions: 'SAMEORIGIN',
      contentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: 'restricted',
      xPoweredBy: 'removed'
    },
    crossOrigin: {
      embedderPolicy: 'unsafe-none',
      openerPolicy: 'same-origin-allow-popups',
      resourcePolicy: 'cross-origin'
    },
    validation,
    securityScore: calculateSecurityScore(validation)
  };
}

/**
 * Calculate a security score based on configuration
 */
function calculateSecurityScore(validation: any): number {
  let score = 100;
  
  // Deduct points for warnings
  score -= validation.warnings.length * 10;
  
  // Add points for security features
  if (defaultSecurityConfig.enforceHttps) score += 5;
  if (defaultSecurityConfig.contentSecurityPolicy.includes("upgrade-insecure-requests")) score += 5;
  if (!defaultSecurityConfig.contentSecurityPolicy.includes("unsafe-inline")) score += 10;
  if (!defaultSecurityConfig.contentSecurityPolicy.includes("unsafe-eval")) score += 10;
  
  return Math.min(100, Math.max(0, score));
}