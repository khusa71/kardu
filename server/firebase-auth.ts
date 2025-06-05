import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin (if not already initialized)
if (getApps().length === 0) {
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Parse the service account key from environment
      const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      // Fallback for development
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
      console.log('⚠️ Firebase Admin initialized without service account (development mode)');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    // Fallback initialization
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
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
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        emailVerified: decodedToken.email_verified,
      };
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ message: 'Invalid token' });
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