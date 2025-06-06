import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
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
  getIdToken?: () => Promise<string>;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
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

  // Listen to Firebase auth state changes and handle redirect results
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for redirect result first
        const { getRedirectResult } = await import('firebase/auth');
        const redirectResult = await getRedirectResult(auth);
        
        if (redirectResult) {
          // User signed in via redirect
          await syncUserWithBackend(redirectResult.user);
          toast({
            title: "Success",
            description: "Signed in with Google successfully!",
          });
        }
      } catch (error: any) {
        console.error('Redirect result error:', error);
        if (error.code === 'auth/unauthorized-domain') {
          toast({
            title: "Authorization Error",
            description: "This domain is not authorized for Google sign-in. Please use email sign-in.",
            variant: "destructive",
          });
        }
      }
    };

    initAuth();

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
          monthlyLimit: backendUserData?.monthlyLimit || 3,
          getIdToken: () => firebaseUser.getIdToken()
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [toast]);

  const signInWithGoogle = async () => {
    try {
      const isProduction = window.location.hostname === 'kardu.io';
      const { signInWithRedirect } = await import('firebase/auth');
      
      // For production (kardu.io), always use redirect flow
      if (isProduction) {
        console.log('Starting Google sign-in redirect for production...');
        await signInWithRedirect(auth, googleProvider);
        return; // User will be redirected, function exits here
      }
      
      // For development, try popup first, then fallback to redirect
      let result;
      try {
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupError: any) {
        console.log('Popup failed, trying redirect...', popupError.code);
        
        if (popupError.code === 'auth/popup-blocked' || 
            popupError.code === 'auth/popup-closed-by-user' ||
            /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
          
          const { getRedirectResult } = await import('firebase/auth');
          
          // Check if we're returning from a redirect
          const redirectResult = await getRedirectResult(auth);
          if (redirectResult) {
            result = redirectResult;
          } else {
            // Start redirect flow
            await signInWithRedirect(auth, googleProvider);
            return; // Function will exit here, user will be redirected
          }
        } else {
          throw popupError;
        }
      }
      
      if (result) {
        await syncUserWithBackend(result.user);
        toast({
          title: "Success",
          description: "Signed in with Google successfully!",
        });
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Handle specific Firebase errors with user-friendly messages
      switch (error.code) {
        case 'auth/unauthorized-domain':
          errorMessage = "This domain is not authorized for Google sign-in. Please contact support or use email sign-in.";
          break;
        case 'auth/popup-blocked':
          errorMessage = "Pop-up was blocked. Trying alternative sign-in method...";
          break;
        case 'auth/cancelled-popup-request':
        case 'auth/popup-closed-by-user':
          errorMessage = "Sign-in was cancelled. Please try again.";
          break;
        case 'auth/network-request-failed':
          errorMessage = "Network error. Please check your connection and try again.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many failed attempts. Please try again later.";
          break;
        default:
          errorMessage = "Google sign-in failed. Please try email sign-in instead.";
          console.error('Google sign-in error:', error);
      }
      
      toast({
        title: "Google Sign-in Error",
        description: errorMessage,
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

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password reset email sent",
        description: "Check your email for instructions to reset your password.",
      });
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Handle specific Firebase errors with user-friendly messages
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email address.";
          break;
        case 'auth/invalid-email':
          errorMessage = "Please enter a valid email address.";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many requests. Please try again later.";
          break;
        default:
          errorMessage = "Unable to send password reset email. Please try again.";
      }
      
      toast({
        title: "Password Reset Error",
        description: errorMessage,
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
    resetPassword,
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