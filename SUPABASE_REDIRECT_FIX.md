# Fix Google OAuth Redirect Issue

## Problem
Google OAuth is redirecting to localhost:3000 instead of your Replit dev URL.

## Root Cause
Your Supabase project has localhost:3000 configured as the redirect URL for Google OAuth.

## Solution Steps

### 1. Update Supabase Authentication Settings
Go to your Supabase dashboard:

1. Navigate to **Authentication** → **URL Configuration**
2. In the **Redirect URLs** section, add your current Replit dev URL:
   ```
   https://62bda998-b4b5-4bb3-9518-b1d809d86273-00-z9kev51o24z0.worf.replit.dev/auth/callback
   ```

3. Also add for production:
   ```
   https://kardu.io/auth/callback
   ```

### 2. Update Google OAuth Configuration
In the same Authentication settings:

1. Go to **Providers** → **Google**
2. Update the **Authorized redirect URIs** to include:
   - Your Replit dev URL: `https://[your-replit-url]/auth/callback`
   - Production URL: `https://kardu.io/auth/callback`
   - Keep localhost:3000 for local development if needed

### 3. Google Cloud Console (if needed)
If you have direct access to Google Cloud Console:

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Find your OAuth 2.0 Client ID
3. Add the Replit URL to **Authorized redirect URIs**

## Current URLs to Add:
- Replit Dev: `https://62bda998-b4b5-4bb3-9518-b1d809d86273-00-z9kev51o24z0.worf.replit.dev/auth/callback`
- Production: `https://kardu.io/auth/callback`
- Local Dev: `http://localhost:3000/auth/callback` (optional)

After making these changes, Google OAuth should redirect to the correct URL.