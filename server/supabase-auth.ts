import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: any = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase initialized');
} else {
  console.log('⚠️ Supabase not initialized - authentication features will be disabled');
  console.log('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    email_verified?: boolean;
    email_confirmed_at?: string | null;
    app_metadata?: {
      providers?: string[];
      [key: string]: any;
    };
    user_metadata?: {
      name?: string;
      avatar_url?: string;
      iss?: string;
      [key: string]: any;
    };
  };
}

export const verifySupabaseToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!supabase) {
    return res.status(503).json({ 
      error: 'Authentication service unavailable',
      message: 'Supabase not configured'
    });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      email_verified: user.email_confirmed_at ? true : false,
      email_confirmed_at: user.email_confirmed_at,
      app_metadata: user.app_metadata || {},
      user_metadata: user.user_metadata || {}
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

export const requireEmailVerification = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address to access this feature'
    });
  }
  next();
};

export { supabase };