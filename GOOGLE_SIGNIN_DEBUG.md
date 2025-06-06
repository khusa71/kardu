# Google Sign-In Debug Guide for kardu.io

## Current Configuration Status

Your app is configured with:
- Domain: `kardu.io`
- Firebase Project: `studycardsai-417ee`
- Current Error: "Google sign-in failed. Please try email sign-in instead."

## Step-by-Step Fix

### 1. Firebase Console Configuration
**URL**: https://console.firebase.google.com/project/studycardsai-417ee/authentication/settings

1. Go to Authentication → Settings → Authorized domains
2. Verify `kardu.io` is listed (add if missing)
3. Save changes

### 2. Google Cloud Console OAuth Configuration
**URL**: https://console.cloud.google.com/apis/credentials?project=studycardsai-417ee

1. Find your OAuth 2.0 Client ID
2. Edit the client
3. Under "Authorized JavaScript origins" add:
   ```
   https://kardu.io
   ```
4. Under "Authorized redirect URIs" add:
   ```
   https://kardu.io/__/auth/handler
   ```
5. Save changes

### 3. Debug Information
To help debug the exact issue, check browser console at `kardu.io` for:
- Network errors in the Console tab
- Any 403/401 errors when clicking Google sign-in
- The exact Firebase error code

### 4. Alternative Solution
If domain authorization continues to fail, the most reliable solution is:

1. Create a new OAuth 2.0 Client ID specifically for `kardu.io`
2. Update your Firebase config to use the new client ID
3. This ensures clean configuration without conflicts

### 5. Immediate Workaround
Email sign-in should work immediately as a fallback while Google sign-in is being configured.

## Verification Steps
After making changes:
1. Wait 5-10 minutes for propagation
2. Clear browser cache
3. Test Google sign-in on `kardu.io`
4. Check browser console for any remaining errors

## Need Help?
If you don't have access to Firebase/Google Cloud consoles, provide the error details from the browser console and I can help identify the specific configuration issue.