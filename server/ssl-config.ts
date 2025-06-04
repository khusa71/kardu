import https from 'https';
import fs from 'fs';
import path from 'path';

export interface SSLConfig {
  key?: string;
  cert?: string;
  ca?: string;
}

/**
 * Attempts to load SSL certificates from various common locations
 */
export function loadSSLCertificates(): SSLConfig | null {
  const certPaths = [
    // Common certificate locations
    '/etc/ssl/certs',
    '/usr/local/share/ca-certificates',
    './certs',
    './ssl'
  ];

  const certFiles = [
    'server.key',
    'server.crt',
    'ca.crt',
    'privkey.pem',
    'cert.pem',
    'chain.pem'
  ];

  try {
    // Look for SSL certificates in common locations
    for (const certPath of certPaths) {
      if (fs.existsSync(certPath)) {
        const config: SSLConfig = {};
        
        // Look for private key
        const keyFiles = ['server.key', 'privkey.pem', 'private.key'];
        for (const keyFile of keyFiles) {
          const keyPath = path.join(certPath, keyFile);
          if (fs.existsSync(keyPath)) {
            config.key = fs.readFileSync(keyPath, 'utf8');
            break;
          }
        }

        // Look for certificate
        const certFileNames = ['server.crt', 'cert.pem', 'certificate.crt'];
        for (const certFile of certFileNames) {
          const certFilePath = path.join(certPath, certFile);
          if (fs.existsSync(certFilePath)) {
            config.cert = fs.readFileSync(certFilePath, 'utf8');
            break;
          }
        }

        // Look for CA certificate
        const caFiles = ['ca.crt', 'chain.pem', 'ca-bundle.crt'];
        for (const caFile of caFiles) {
          const caPath = path.join(certPath, caFile);
          if (fs.existsSync(caPath)) {
            config.ca = fs.readFileSync(caPath, 'utf8');
            break;
          }
        }

        if (config.key && config.cert) {
          return config;
        }
      }
    }
  } catch (error) {
    console.log('SSL certificate loading error:', error);
  }

  return null;
}

/**
 * Creates HTTPS server if SSL certificates are available
 */
export function createSecureServer(app: any): https.Server | null {
  const sslConfig = loadSSLCertificates();
  
  if (sslConfig && sslConfig.key && sslConfig.cert) {
    return https.createServer({
      key: sslConfig.key,
      cert: sslConfig.cert,
      ca: sslConfig.ca
    }, app);
  }

  return null;
}

/**
 * Checks if the current environment supports HTTPS
 */
export function isHTTPSSupported(): boolean {
  // Check if running behind a reverse proxy (like in Replit deployments)
  const hasProxyHeaders = process.env.HTTP_X_FORWARDED_PROTO || 
                          process.env.HTTP_X_FORWARDED_SSL ||
                          process.env.HTTP_CF_VISITOR;
  
  // Check if SSL certificates are available
  const hasSSLCerts = loadSSLCertificates() !== null;
  
  return hasProxyHeaders !== undefined || hasSSLCerts;
}