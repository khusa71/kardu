import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB7VS53uDBw1sP6MGpZPNcn-aRXKEUGstU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "studycardsai-417ee.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "studycardsai-417ee",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "studycardsai-417ee.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1081228194987",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1081228194987:web:22b4baedb5e05e9ab4b3ee",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider
googleProvider.addScope('email');
googleProvider.addScope('profile');

// Set custom parameters for better production compatibility
googleProvider.setCustomParameters({
  prompt: 'select_account',
  hd: '' // Allow any domain
});