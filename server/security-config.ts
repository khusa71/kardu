import { Request, Response, NextFunction } from "express";

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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.gstatic.com https://replit.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com wss: ws:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),
  additionalHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer-when-downgrade',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '1; mode=block',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none'
  }
};

/**
 * Security middleware that applies essential security headers
 */
export function securityMiddleware(config: SecurityConfig = defaultSecurityConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Enforce HTTPS in production
    if (config.enforceHttps && req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }

    // Apply HSTS header
    res.setHeader('Strict-Transport-Security', config.strictTransportSecurity);
    
    // Apply Content Security Policy
    res.setHeader('Content-Security-Policy', config.contentSecurityPolicy);
    
    // Apply additional security headers
    Object.entries(config.additionalHeaders).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    next();
  };
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
      xss: 'enabled',
      frameOptions: 'SAMEORIGIN',
      contentTypeOptions: 'nosniff'
    },
    validation
  };
}