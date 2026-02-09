# Auth0 Migration Guide

This document explains how to configure and use Auth0 authentication in the Joblify application.

## Overview

Joblify has been integrated with Auth0 to provide enterprise-grade authentication while maintaining the existing custom UI and user experience. The integration supports both Auth0 and legacy authentication modes, allowing for a gradual migration.

## Features

- **Custom UI**: All existing login and registration forms are preserved
- **Auth0 Backend**: User authentication is handled by Auth0's secure infrastructure
- **JWT Tokens**: Access tokens, refresh tokens, and ID tokens for secure API access
- **Automatic Token Refresh**: Tokens are automatically refreshed before expiration
- **User Synchronization**: Auth0 users are synced with the local database
- **Backward Compatibility**: Works with or without Auth0 configuration

## Setup Instructions

### 1. Create an Auth0 Account

1. Go to [auth0.com](https://auth0.com) and sign up for a free account
2. Create a new tenant (e.g., `joblify-dev` or `joblify-prod`)

### 2. Create an Auth0 Application

1. In the Auth0 Dashboard, go to **Applications** > **Applications**
2. Click **Create Application**
3. Choose **Regular Web Application**
4. Name it (e.g., "Joblify Web App")
5. Select **Node.js (Express)** as the technology
6. Click **Create**

### 3. Configure Application Settings

In your newly created application's settings:

1. **Allowed Callback URLs**: Add `http://localhost:5000/api/auth/callback`
   - For production, add your production URL (e.g., `https://yourdomain.com/api/auth/callback`)

2. **Allowed Logout URLs**: Add `http://localhost:5000`
   - For production, add your production URL (e.g., `https://yourdomain.com`)

3. **Allowed Web Origins**: Add `http://localhost:5000`
   - For production, add your production URL

4. **Grant Types**: Ensure these are enabled:
   - Authorization Code
   - Refresh Token
   - **Password** (Required for custom login UI)

5. Click **Save Changes**

### 4. Create an Auth0 API

1. In the Auth0 Dashboard, go to **Applications** > **APIs**
2. Click **Create API**
3. Set the following:
   - **Name**: Joblify API
   - **Identifier**: `https://api.joblify.com` (or your preferred identifier)
   - **Signing Algorithm**: RS256
4. Click **Create**

### 5. Configure Database Connection

1. Go to **Authentication** > **Database**
2. Click on **Username-Password-Authentication** (or create a new connection)
3. Ensure these settings:
   - **Requires Username**: Enable this
   - **Signup**: Enable this
   - **Email Verification**: Enable this (Auth0 will send verification emails)
4. Configure password strength to match your requirements:
   - Minimum length: 8 characters
   - At least one lowercase letter
   - At least one uppercase letter
   - At least one number
5. Save changes

### 6. Set Up Environment Variables

Copy the following values from your Auth0 application to your `.env` file:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.joblify.com
AUTH0_CALLBACK_URL=http://localhost:5000/api/auth/callback
AUTH0_LOGOUT_URL=http://localhost:5000

# Optional: Management API credentials (for advanced user management)
AUTH0_MANAGEMENT_API_CLIENT_ID=your-management-api-client-id
AUTH0_MANAGEMENT_API_CLIENT_SECRET=your-management-api-client-secret
```

**Where to find these values:**

- `AUTH0_DOMAIN`: In your Application settings, look for "Domain"
- `AUTH0_CLIENT_ID`: In your Application settings, look for "Client ID"
- `AUTH0_CLIENT_SECRET`: In your Application settings, look for "Client Secret"
- `AUTH0_AUDIENCE`: The identifier you set when creating the API

### 7. Enable Password Grant Type (Important!)

The Resource Owner Password Grant is **required** for the custom login UI to work.

1. In Auth0 Dashboard, go to your application settings
2. Scroll to **Advanced Settings** > **Grant Types**
3. Ensure **Password** is checked
4. Click **Save Changes**

**Note**: This grant type is disabled by default for security reasons. Only enable it if you're using a trusted first-party application with a custom login UI.

### 8. Customize Auth0 Email Templates (Optional)

1. Go to **Branding** > **Email Templates**
2. Customize the following templates:
   - Verification Email
   - Change Password
   - Welcome Email
3. Update the "From" address and sender name to match your brand

### 9. Test the Integration

1. Start your application:
   ```bash
   npm run dev
   ```

2. Try registering a new user:
   - Go to `http://localhost:5000/register`
   - Fill out the registration form
   - Check your email for verification

3. Try logging in:
   - Go to `http://localhost:5000/login`
   - Use your credentials
   - You should be redirected to the dashboard

## How It Works

### Registration Flow

1. User fills out the custom registration form
2. Frontend sends data to `/api/auth/register`
3. Backend creates a user in Auth0 using Management API
4. Auth0 sends verification email to user
5. User data is synced to local database
6. User is logged in with session

### Login Flow

1. User fills out the custom login form
2. Frontend sends credentials to `/api/auth/login`
3. Backend authenticates with Auth0 using Resource Owner Password Grant
4. Auth0 returns access token, refresh token, and ID token
5. Tokens are stored in session and localStorage
6. User is redirected to dashboard

### Token Management

- **Access Token**: Used to authenticate API requests (expires in 1 hour)
- **Refresh Token**: Used to obtain new access tokens (long-lived)
- **ID Token**: Contains user profile information

Tokens are automatically refreshed when they expire.

### API Request Flow

1. Frontend makes an API request
2. `queryClient.ts` adds `Authorization: Bearer {access_token}` header
3. Backend validates the token (or falls back to session)
4. Request is processed if token is valid

## Security Considerations

### Token Storage

Tokens are stored in two places:
- **Session**: Server-side storage (recommended for most sensitive operations)
- **localStorage**: Client-side storage (for token refresh)

For production, consider using httpOnly cookies for token storage.

### Password Grant Security

The Resource Owner Password Grant should only be used for:
- First-party applications (your own frontend)
- Trusted environments
- When you need a custom login UI

**Do not** use this grant type for third-party applications.

### CORS and Security Headers

Ensure your production environment has:
- Proper CORS configuration
- HTTPS enabled
- Secure session configuration
- CSRF protection

## Fallback to Legacy Authentication

If Auth0 is not configured (environment variables missing), the application automatically falls back to legacy session-based authentication with scrypt password hashing.

To disable Auth0 and use legacy auth:
1. Remove or comment out Auth0 environment variables
2. Restart the application

## Troubleshooting

### "Invalid credentials" error on login

- Verify the user exists in Auth0 Dashboard > User Management
- Check that Password grant type is enabled
- Verify AUTH0_DOMAIN and AUTH0_CLIENT_ID are correct

### "Failed to create Auth0 user" on registration

- Check AUTH0_MANAGEMENT_API_CLIENT_ID and AUTH0_MANAGEMENT_API_CLIENT_SECRET
- Verify the database connection is enabled and configured
- Check Auth0 Dashboard > Logs for detailed error messages

### Tokens not refreshing

- Verify refresh token is being stored correctly
- Check that the refresh token hasn't expired
- Ensure `/api/auth/refresh` endpoint is accessible

### Email verification not working

- Verify email configuration in Auth0 Dashboard > Branding > Email Provider
- Check that email verification is enabled in database connection settings
- Look for bounced emails in Auth0 Dashboard > Logs

## Migration from Legacy Auth

To migrate existing users from legacy authentication:

1. **Option 1: Gradual Migration**
   - Keep both auth systems running
   - When a user logs in with legacy auth, migrate them to Auth0
   - Create the Auth0 user on first login

2. **Option 2: Bulk Migration**
   - Use Auth0's bulk user import feature
   - Export users from local database
   - Format as JSON and import to Auth0

3. **Option 3: User-initiated Migration**
   - Prompt users to reset their password
   - Create Auth0 user during password reset
   - Link to local database record

## Production Checklist

- [ ] Auth0 tenant configured for production
- [ ] Production URLs added to allowed callbacks and origins
- [ ] HTTPS enabled on production server
- [ ] Session secret is a strong random string
- [ ] Auth0 client secret is kept secure
- [ ] Email templates customized with brand
- [ ] Rate limiting configured
- [ ] Token expiration times reviewed
- [ ] Logging and monitoring enabled
- [ ] Backup authentication method tested

## Support

For Auth0-specific issues:
- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Community](https://community.auth0.com)
- [Auth0 Support](https://support.auth0.com)

For Joblify-specific issues:
- Check the application logs
- Review this migration guide
- Contact the development team

## Additional Resources

- [Auth0 Node.js SDK Documentation](https://github.com/auth0/node-auth0)
- [Auth0 Best Practices](https://auth0.com/docs/best-practices)
- [OAuth 2.0 Resource Owner Password Grant](https://auth0.com/docs/get-started/authentication-and-authorization-flow/resource-owner-password-flow)
- [JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)
