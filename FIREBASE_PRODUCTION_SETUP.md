# Firebase Production Setup Guide

## Google Sign-In Configuration for Production

To fix Google sign-in issues in production, you need to configure Firebase properly:

### 1. Firebase Console Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Select your project**: `studycardsai-417ee`
3. **Navigate to Authentication > Sign-in method**
4. **Configure Google provider**:
   - Enable Google sign-in
   - Add your production domain to **Authorized domains**
   - Required domain to add:
     - `kardu.io`

### 2. Google Cloud Console Configuration

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select project**: `studycardsai-417ee`
3. **APIs & Services > Credentials**
4. **Find your OAuth 2.0 client ID**
5. **Add Authorized JavaScript origins**:
   - `https://kardu.io`
6. **Add Authorized redirect URIs**:
   - `https://kardu.io/__/auth/handler`
   - `https://kardu.io`

### 3. Service Account Setup

For server-side authentication, you need a service account:

1. **Go to Google Cloud Console > IAM & Admin > Service Accounts**
2. **Create a new service account** or use existing one
3. **Download the JSON key file**
4. **Copy the entire JSON content** and set it as `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### 4. Environment Variables

Ensure these are set in production:

```
VITE_FIREBASE_API_KEY=AIzaSyB7VS53uDBw1sP6MGpZPNcn-aRXKEUGstU
VITE_FIREBASE_PROJECT_ID=studycardsai-417ee
VITE_FIREBASE_APP_ID=1:1081228194987:web:22b4baedb5e05e9ab4b3ee
GOOGLE_APPLICATION_CREDENTIALS={full JSON service account key}
```

### 5. Common Issues and Solutions

**Issue**: "unauthorized-domain" error
**Solution**: Add your production domain to Firebase authorized domains

**Issue**: "popup-blocked" error  
**Solution**: The app now automatically falls back to redirect flow

**Issue**: "network-request-failed"
**Solution**: Check CORS configuration and ensure HTTPS is used

### 6. Testing

1. Deploy to production
2. Test Google sign-in from production URL
3. Check browser console for specific error messages
4. Verify domains are correctly configured

### 7. Fallback Authentication

If Google sign-in still fails, users can:
- Use email/password registration
- Contact support for assistance
- Check if pop-ups are enabled in their browser

## Security Notes

- Always use HTTPS in production
- Keep service account keys secure
- Regularly rotate API keys
- Monitor authentication logs for suspicious activity