# SSL/TLS Security Configuration Guide

## Current Security Issue

Your website is showing "Not secure: Site connection isn't private" because it's currently running on HTTP instead of HTTPS. This happens when SSL/TLS certificates aren't properly configured.

## Security Enhancements Implemented

### 1. HTTPS Enforcement
- Automatic redirect from HTTP to HTTPS in production
- Support for multiple proxy headers (x-forwarded-proto, x-scheme)
- Trust proxy configuration for Replit deployments

### 2. Security Headers Added
- **Strict-Transport-Security**: Forces HTTPS for 2 years
- **X-Content-Type-Options**: Prevents MIME sniffing attacks
- **X-Frame-Options**: Prevents clickjacking
- **X-XSS-Protection**: Enables XSS filtering
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts dangerous browser features
- **Content-Security-Policy**: Comprehensive CSP for XSS prevention

### 3. SSL Certificate Handling
- Automatic detection of SSL certificates
- Support for common certificate locations
- Fallback to HTTP with proxy SSL termination

## Replit Deployment Instructions

### For Replit Deployments:
1. **Deploy your application** using Replit's deployment feature
2. **Use the `.replit.app` domain** provided by Replit (automatically has SSL)
3. **Avoid accessing via direct IP** or HTTP URLs

### SSL Certificate Sources:
- Replit automatically provides SSL certificates for `.replit.app` domains
- Custom domains require SSL certificate configuration
- Let's Encrypt certificates are supported

## Fixing the Security Warning

### Option 1: Use Replit's HTTPS URL
```
https://your-project-name.username.replit.app
```

### Option 2: Deploy to Production
1. Click the "Deploy" button in your Replit workspace
2. Choose "Autoscale" or "Reserved VM" deployment
3. Access via the provided HTTPS URL

### Option 3: Custom Domain with SSL
1. Purchase SSL certificate from a CA
2. Configure DNS records
3. Upload certificates to your deployment

## Testing Your Security

### Check HTTPS Status:
```bash
curl -I https://your-domain.com
```

### Verify Security Headers:
```bash
curl -I https://your-domain.com | grep -E "(Strict-Transport|Content-Security|X-)"
```

### SSL Certificate Test:
```bash
openssl s_client -connect your-domain.com:443
```

## Production Checklist

- [ ] Deploy via Replit Deployments
- [ ] Access site via HTTPS URL only
- [ ] Verify security headers are present
- [ ] Test automatic HTTP to HTTPS redirect
- [ ] Confirm SSL certificate is valid
- [ ] Check for mixed content warnings

## Troubleshooting

### "Not Secure" Warning Persists:
1. Ensure you're using `https://` not `http://`
2. Clear browser cache and cookies
3. Check for mixed content (HTTP resources on HTTPS page)
4. Verify domain SSL certificate validity

### Mixed Content Issues:
- Update all API calls to use HTTPS
- Ensure external resources use HTTPS
- Check console for security warnings

## Environment Variables

Add these to your Replit secrets:
```
NODE_ENV=production
REPLIT_DEPLOYMENT=true
```

## Next Steps

1. **Deploy your application** using Replit's deployment feature
2. **Access via the HTTPS URL** provided by Replit
3. **Verify the security headers** are working
4. **Test all functionality** on the secure connection

The security warning should disappear once you access your deployed application via the proper HTTPS URL provided by Replit.