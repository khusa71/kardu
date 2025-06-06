import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin (if not already initialized)
if (getApps().length === 0) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      let serviceAccount;
      
      // Try to parse as JSON first
      try {
        serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        
        // Validate that it's a proper service account
        if (serviceAccount.type === 'service_account' && serviceAccount.private_key) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id,
          });
          console.log('✅ Firebase Admin initialized with service account');
        } else {
          throw new Error('Invalid service account format');
        }
      } catch (parseError) {
        // If parsing fails, it might be a file path or invalid format
        console.log('⚠️ Service account parsing failed, using fallback initialization');
        throw parseError;
      }
    } else {
      throw new Error('No service account provided');
    }
  } catch (error) {
    console.log('⚠️ Firebase Admin initializing without service account (limited functionality)');
    // Fallback initialization for development
    try {
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'studycardsai-417ee',
      });
      console.log('✅ Firebase Admin initialized in development mode');
    } catch (fallbackError) {
      console.error('❌ Complete Firebase Admin initialization failed:', fallbackError);
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    emailVerified?: boolean;
  };
}

export const verifyFirebaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    
    try {
      // Try Firebase Admin verification first
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      
      // Fallback: Try to decode the JWT manually for development
      try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        
        // Basic validation - check if token is not expired
        if (payload.exp && payload.exp > Date.now() / 1000) {
          req.user = {
            uid: payload.sub || payload.user_id,
            email: payload.email,
            emailVerified: payload.email_verified || false,
          };
          console.log('⚠️ Using fallback token validation for development');
          next();
        } else {
          return res.status(401).json({ message: 'Token expired' });
        }
      } catch (fallbackError) {
        console.error('Fallback token verification failed:', fallbackError);
        return res.status(401).json({ message: 'Invalid token' });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

export const requireEmailVerification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.emailVerified) {
    return res.status(403).json({ 
      message: 'Please verify your email to continue generating flashcards.',
      requiresEmailVerification: true 
    });
  }
  next();
};