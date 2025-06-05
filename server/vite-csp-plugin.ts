import { Plugin } from 'vite';

/**
 * Vite plugin to inject CSP nonces into HTML template
 * This eliminates the need for unsafe-inline and fixes React plugin compatibility
 */
export function cspNoncePlugin(): Plugin {
  return {
    name: 'csp-nonce-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Generate nonce for each request
        const nonce = Buffer.from(Math.random().toString()).toString('base64').substring(0, 16);
        
        // Store nonce in response locals for CSP header
        (res as any).locals = { ...(res as any).locals, nonce };
        
        // Intercept HTML responses to inject nonce
        const originalWrite = res.write;
        const originalEnd = res.end;
        let htmlBuffer = '';
        
        res.write = function(chunk: any, ...args: any[]) {
          if (typeof chunk === 'string' && chunk.includes('<!DOCTYPE html>')) {
            htmlBuffer += chunk;
            return true;
          }
          return originalWrite.call(this, chunk, ...args);
        };
        
        res.end = function(chunk?: any, ...args: any[]) {
          if (chunk && typeof chunk === 'string' && chunk.includes('<!DOCTYPE html>')) {
            htmlBuffer += chunk;
          }
          
          if (htmlBuffer && htmlBuffer.includes('{{CSP_NONCE}}')) {
            const processedHtml = htmlBuffer.replace(/{{CSP_NONCE}}/g, nonce);
            return originalEnd.call(this, processedHtml, ...args);
          }
          
          return originalEnd.call(this, chunk, ...args);
        };
        
        next();
      });
    }
  };
}