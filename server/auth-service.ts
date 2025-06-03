import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface User {
  id: number;
  email: string;
  password_hash: string;
  plan: 'free' | 'pro';
  monthly_uploads: number;
  monthly_limit: number;
  created_at: Date;
  last_login: Date;
}

export interface AuthRequest extends Request {
  user?: User;
}

export class AuthService {
  private users: Map<number, User> = new Map();
  private currentId = 1;
  private JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  async register(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    // Check if user already exists
    const existingUser = Array.from(this.users.values()).find(u => u.email === email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user: User = {
      id: this.currentId++,
      email,
      password_hash,
      plan: 'free',
      monthly_uploads: 0,
      monthly_limit: 3,
      created_at: new Date(),
      last_login: new Date()
    };

    this.users.set(user.id, user);

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, this.JWT_SECRET, { expiresIn: '7d' });

    const { password_hash: _, ...userResponse } = user;
    return { user: userResponse, token };
  }

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>, token: string }> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.last_login = new Date();

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, this.JWT_SECRET, { expiresIn: '7d' });

    const { password_hash: _, ...userResponse } = user;
    return { user: userResponse, token };
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async incrementUserUploads(userId: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.monthly_uploads++;
    }
  }

  async resetMonthlyUploads(): Promise<void> {
    // Reset all users' monthly uploads (run monthly)
    this.users.forEach(user => {
      user.monthly_uploads = 0;
    });
  }

  async upgradeToPro(userId: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.plan = 'pro';
      user.monthly_limit = 100; // Pro users get 100 uploads per month
    }
  }

  // Middleware to authenticate requests
  authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, this.JWT_SECRET, async (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }

      const user = await this.getUserById(decoded.userId);
      if (!user) {
        return res.status(403).json({ message: 'User not found' });
      }

      req.user = user;
      next();
    });
  };

  // Middleware to check upload limits
  checkUploadLimit = (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (user.monthly_uploads >= user.monthly_limit && user.plan === 'free') {
      return res.status(429).json({ 
        message: 'Monthly upload limit reached. Upgrade to Pro for unlimited uploads.',
        limit: user.monthly_limit,
        used: user.monthly_uploads,
        plan: user.plan
      });
    }

    next();
  };

  // Optional authentication (for public/private deck access)
  optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // No token, continue without auth
    }

    jwt.verify(token, this.JWT_SECRET, async (err: any, decoded: any) => {
      if (!err && decoded) {
        const user = await this.getUserById(decoded.userId);
        if (user) {
          req.user = user;
        }
      }
      next();
    });
  };
}

export const authService = new AuthService();