import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  provider: string;
  isEmailVerified?: boolean;
  isPremium?: boolean;
  monthlyUploads?: number;
  monthlyLimit?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Sync user data with backend
  const syncUserWithBackend = async (firebaseUser: User) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email'
        })
      });

      if (response.ok) {
        const userData = await response.json();
        return userData;
      }
    } catch (error) {
      console.error('Error syncing user with backend:', error);
    }
    return null;
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const backendUserData = await syncUserWithBackend(firebaseUser);
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
          provider: firebaseUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
          isEmailVerified: backendUserData?.isEmailVerified || firebaseUser.emailVerified,
          isPremium: backendUserData?.isPremium || false,
          monthlyUploads: backendUserData?.monthlyUploads || 0,
          monthlyLimit: backendUserData?.monthlyLimit || 3
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserWithBackend(result.user);
      toast({
        title: "Success",
        description: "Signed in with Google successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUserWithBackend(result.user);
      toast({
        title: "Success",
        description: "Signed in successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(result.user, { displayName });
      
      // Send verification email
      await sendEmailVerification(result.user);
      
      await syncUserWithBackend(result.user);
      
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        toast({
          title: "Verification email sent",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const refreshUserData = async () => {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      const backendUserData = await syncUserWithBackend(auth.currentUser);
      
      if (backendUserData) {
        setUser({
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
          photoURL: auth.currentUser.photoURL,
          emailVerified: auth.currentUser.emailVerified,
          provider: auth.currentUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
          isEmailVerified: backendUserData.isEmailVerified || auth.currentUser.emailVerified,
          isPremium: backendUserData.isPremium || false,
          monthlyUploads: backendUserData.monthlyUploads || 0,
          monthlyLimit: backendUserData.monthlyLimit || 3
        });
      }
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    logout,
    sendVerificationEmail,
    refreshUserData
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

export function useFirebaseAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useFirebaseAuth must be used within an AuthProvider');
  }
  return context;
}