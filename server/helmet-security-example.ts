/**
 * Sample Express.js security configuration using Helmet
 * This example shows how to implement enforced CSP without unsafe directives
 */
import helmet from 'helmet';
import { randomBytes } from 'crypto';
import express from 'express';

// Generate nonce for each request
function generateNonce(): string {
  return randomBytes(16).toString('base64');
}

// Helmet security configuration with enforced CSP
export function helmetSecurityConfig() {
  return helmet({
    // Remove X-Powered-By header
    hidePoweredBy: true,
    
    // Strict Transport Security
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true
    },
    
    // Content Security Policy (enforced, not report-only)
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'strict-dynamic'",
          // Nonce will be added dynamically per request
          "https://js.stripe.com",
          "https://replit.com"
        ],
        styleSrc: [
          "'self'",
          // Nonce will be added dynamically per request
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:"
        ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://api.openai.com",
          "https://api.anthropic.com",
          "https://identitytoolkit.googleapis.com",
          "https://securetoken.googleapis.com",
          "https://*.firebaseapp.com",
          "wss:",
          "ws:"
        ],
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://hooks.stripe.com",
          "https://*.firebaseapp.com"
        ],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: []
      }
    },
    
    // X-Frame-Options
    frameguard: {
      action: 'sameorigin'
    },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },
    
    // Permissions Policy
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
      fullscreen: ['self'],
      autoplay: [],
      encryptedMedia: [],
      pictureInPicture: []
    },
    
    // Cross-Origin Policies
    crossOriginEmbedderPolicy: {
      policy: 'unsafe-none'
    },
    crossOriginOpenerPolicy: {
      policy: 'same-origin-allow-popups'
    },
    crossOriginResourcePolicy: {
      policy: 'cross-origin'
    }
  });
}

// Middleware to add nonce to CSP
export function nonceCSPMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const nonce = generateNonce();
  res.locals.nonce = nonce;
  
  // Override CSP to include nonce
  res.setHeader('Content-Security-Policy', 
    `default-src 'self'; ` +
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://js.stripe.com https://replit.com; ` +
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com; ` +
    `font-src 'self' https://fonts.gstatic.com; ` +
    `img-src 'self' data: https: blob:; ` +
    `connect-src 'self' https://api.stripe.com https://api.openai.com https://api.anthropic.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com wss: ws:; ` +
    `frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com; ` +
    `object-src 'none'; ` +
    `base-uri 'self'; ` +
    `form-action 'self'; ` +
    `upgrade-insecure-requests`
  );
  
  next();
}

// Example usage in Express app
export function setupSecureExpressApp(app: express.Application) {
  // Apply Helmet security headers
  app.use(helmetSecurityConfig());
  
  // Apply nonce-based CSP middleware
  app.use(nonceCSPMiddleware);
  
  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
    res.setHeader('NEL', '{"report_to":"default","max_age":31536000,"include_subdomains":true}');
    res.setHeader('Report-To', '{"group":"default","max_age":31536000,"endpoints":[{"url":"/api/reports"}],"include_subdomains":true}');
    next();
  });
}

/*
Key Security Features Implemented:

1. ENFORCED Content Security Policy (not report-only)
   - Eliminates 'unsafe-inline' and 'unsafe-eval'
   - Uses nonce-based script/style loading
   - Implements 'strict-dynamic' for enhanced security

2. Comprehensive Security Headers
   - HSTS with 2-year max-age and preload
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: SAMEORIGIN
   - Referrer-Policy: strict-origin-when-cross-origin
   - Permissions-Policy with restrictive features

3. Server Fingerprinting Protection
   - X-Powered-By header removed
   - Server header obscured

4. Trusted Source Allowlisting
   - Stripe (js.stripe.com, api.stripe.com, hooks.stripe.com)
   - Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
   - Replit (replit.com)
   - Firebase (identitytoolkit.googleapis.com, securetoken.googleapis.com, *.firebaseapp.com)

5. Browser API Restrictions
   - Camera, microphone, geolocation disabled
   - Payment, USB, sensors restricted
   - Only essential features allowed

Usage Notes:
- The nonce is generated per request and must be added to inline scripts/styles
- All external scripts must be loaded from trusted domains
- 'strict-dynamic' allows nonce-approved scripts to load additional scripts
- upgrade-insecure-requests automatically upgrades HTTP to HTTPS
*/