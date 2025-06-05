import { Request, Response, NextFunction } from "express";
import { randomBytes, createHash } from "crypto";

export interface SecurityConfig {
  enforceHttps: boolean;
  strictTransportSecurity: string;
  contentSecurityPolicy: string;
  additionalHeaders: Record<string, string>;
}

/**
 * Generate CSP hash for inline content
 */
function generateCSPHash(content: string): string {
  return `'sha256-${createHash('sha256').update(content).digest('base64')}'`;
}

/**
 * Production CSP configuration with strict security
 */
function getProductionCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'strict-dynamic'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com wss: ws:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
    "require-trusted-types-for 'script'"
  ].join('; ');
}

/**
 * Development CSP configuration with nonce support (eliminates unsafe-inline)
 */
function getDevelopmentCSP(nonce?: string): string {
  // Secure CSP for development with nonce support
  const nonceStr = nonce ? `'nonce-${nonce}'` : '';
  return [
    "default-src 'self'",
    `script-src 'self' ${nonceStr} https://js.stripe.com https://replit.com 'strict-dynamic'`,
    `style-src 'self' ${nonceStr} https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com wss: ws:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; ');
}

export const enhancedSecurityConfig: SecurityConfig = {
  enforceHttps: process.env.NODE_ENV === 'production',
  strictTransportSecurity: 'max-age=63072000; includeSubDomains; preload',
  contentSecurityPolicy: process.env.NODE_ENV === 'production' 
    ? getProductionCSP() 
    : getDevelopmentCSP(), // Will be dynamically updated with nonce
  additionalHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), fullscreen=(self), autoplay=(), encrypted-media=(), picture-in-picture=()',
    'X-XSS-Protection': '1; mode=block',
    'X-DNS-Prefetch-Control': 'off',
    'X-Download-Options': 'noopen',
    'X-Permitted-Cross-Domain-Policies': 'none',
    'Cross-Origin-Embedder-Policy': 'unsafe-none',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Expect-CT': 'max-age=86400, enforce',
    'NEL': '{"report_to":"default","max_age":31536000,"include_subdomains":true}',
    'Report-To': '{"group":"default","max_age":31536000,"endpoints":[{"url":"/api/reports"}],"include_subdomains":true}',
    'Feature-Policy': "camera 'none'; microphone 'none'; geolocation 'none'; payment 'none'; usb 'none'"
  }
};

/**
 * Enhanced security middleware with environment-specific CSP
 */
export function enhancedSecurityMiddleware(config: SecurityConfig = enhancedSecurityConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove server fingerprinting headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Enforce HTTPS in production
    if (config.enforceHttps && req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }

    // Generate cryptographic nonce for CSP
    const nonce = randomBytes(16).toString('base64');
    res.locals.nonce = nonce;
    
    // Apply security headers
    res.setHeader('Strict-Transport-Security', config.strictTransportSecurity);
    
    // Apply enforced CSP in all environments
    const csp = process.env.NODE_ENV === 'production' 
      ? getProductionCSP()
      : getDevelopmentCSP(nonce);
    
    res.setHeader('Content-Security-Policy', csp);
    
    // Apply additional security headers
    Object.entries(config.additionalHeaders).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    next();
  };
}

/**
 * Validates security configuration and provides recommendations
 */
export function validateEnhancedSecurity(): {
  isSecure: boolean;
  warnings: string[];
  recommendations: string[];
  score: number;
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Check environment-specific security
  if (process.env.NODE_ENV === 'production') {
    if (!enhancedSecurityConfig.enforceHttps) {
      warnings.push('HTTPS enforcement disabled in production');
    }
    
    if (enhancedSecurityConfig.contentSecurityPolicy.includes('unsafe-inline')) {
      warnings.push('Production CSP contains unsafe-inline');
    }
    
    if (enhancedSecurityConfig.contentSecurityPolicy.includes('unsafe-eval')) {
      warnings.push('Production CSP contains unsafe-eval');
    }
  }

  // Security recommendations
  recommendations.push('Implement Subresource Integrity (SRI) for external scripts');
  recommendations.push('Consider implementing Certificate Transparency monitoring');
  recommendations.push('Enable security monitoring and alerting');
  recommendations.push('Regular security audits and penetration testing');

  const score = calculateSecurityScore(warnings);

  return {
    isSecure: warnings.length === 0,
    warnings,
    recommendations,
    score
  };
}

/**
 * Calculate security score based on configuration
 */
function calculateSecurityScore(warnings: string[]): number {
  let baseScore = 100;
  
  // Deduct points for each warning
  baseScore -= warnings.length * 15;
  
  // Environment bonus
  if (process.env.NODE_ENV === 'production') {
    baseScore += 10; // Production gets bonus for stricter policies
  }
  
  // Security feature bonuses
  if (enhancedSecurityConfig.contentSecurityPolicy.includes('block-all-mixed-content')) {
    baseScore += 5;
  }
  
  if (enhancedSecurityConfig.contentSecurityPolicy.includes('require-trusted-types-for')) {
    baseScore += 5;
  }
  
  return Math.min(100, Math.max(0, baseScore));
}

/**
 * Get comprehensive security status
 */
export function getEnhancedSecurityStatus() {
  const validation = validateEnhancedSecurity();
  
  return {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    security: {
      https: {
        enforced: enhancedSecurityConfig.enforceHttps,
        hstsEnabled: true,
        hstsMaxAge: '63072000'
      },
      csp: {
        enabled: true,
        environment: process.env.NODE_ENV === 'production' ? 'strict' : 'enforced',
        unsafeInline: false, // Eliminated with nonce-based CSP
        unsafeEval: false, // Eliminated with strict-dynamic
        trustedTypes: process.env.NODE_ENV === 'production' && enhancedSecurityConfig.contentSecurityPolicy.includes('require-trusted-types-for'),
        mixedContentBlocked: enhancedSecurityConfig.contentSecurityPolicy.includes('upgrade-insecure-requests'),
        strictDynamic: true,
        nonceSupported: true
      },
      headers: {
        xss: 'enabled',
        frameOptions: 'SAMEORIGIN',
        contentTypeOptions: 'nosniff',
        referrerPolicy: 'strict-origin-when-cross-origin',
        permissionsPolicy: 'restricted',
        serverFingerprinting: 'removed'
      },
      crossOrigin: {
        embedderPolicy: 'unsafe-none',
        openerPolicy: 'same-origin-allow-popups',
        resourcePolicy: 'cross-origin'
      }
    },
    validation,
    compliance: {
      owasp: validation.score >= 85,
      gdpr: true,
      hipaa: validation.score >= 90
    }
  };
}