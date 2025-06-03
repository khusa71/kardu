import { Request, Response, NextFunction } from 'express';
import { auth } from 'firebase-admin';
import { initializeApp, cert, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin (if not already initialized)
if (getApps().length === 0) {
  // In production, you would use a service account key
  // For development, we'll use the project ID from environment
  initializeApp({
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  });
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
      const decodedToken = await auth().verifyIdToken(idToken);
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