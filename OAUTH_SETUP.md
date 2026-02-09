# OAuth Integration Guide

This document explains how to set up OAuth authentication (Google and Apple Sign-In) for Joblify.

## Overview

Joblify now supports OAuth 2.0 authentication with:
- **Google Sign-In**: Login with Google accounts
- **Apple Sign-In**: Login with Apple ID

Users can sign up and log in using their existing Google or Apple accounts, making the registration process faster and more secure.

## Features

- **Seamless Integration**: OAuth buttons are integrated into both login and registration pages
- **Existing Account Linking**: If a user signs in with OAuth using an email that already exists in the system, their OAuth provider is automatically linked to their existing account
- **Password Optional**: Users who sign up with OAuth don't need to set a password
- **Email Verification**: OAuth users have their email automatically verified by the provider
- **Secure Session Management**: Uses Passport.js for secure OAuth flow management

## Setup Instructions

### Prerequisites

1. A Google Cloud Console account (for Google OAuth)
2. An Apple Developer account (for Apple OAuth)
3. Your application's base URL (e.g., `https://yourdomain.com` or `http://localhost:5000` for development)

### Google OAuth Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google+ API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type
   - Add authorized redirect URIs:
     - For development: `http://localhost:5000/api/auth/google/callback`
     - For production: `https://yourdomain.com/api/auth/google/callback`
   - Click "Create"
   - Copy the Client ID and Client Secret

4. **Add to Environment Variables**:
   ```bash
   GOOGLE_CLIENT_ID=your-google-client-id-here
   GOOGLE_CLIENT_SECRET=your-google-client-secret-here
   ```

### Apple OAuth Setup

Apple OAuth is more complex due to the key-based authentication system.

1. **Register an App ID**:
   - Go to [Apple Developer](https://developer.apple.com/account/resources/identifiers/list)
   - Click "+" to create a new identifier
   - Select "App IDs" and click "Continue"
   - Select "App" and click "Continue"
   - Fill in the description and Bundle ID (e.g., `com.yourcompany.joblify`)
   - Enable "Sign in with Apple" capability
   - Click "Continue" and "Register"

2. **Create a Services ID**:
   - Go to Identifiers and click "+"
   - Select "Services IDs" and click "Continue"
   - Enter an identifier (e.g., `com.yourcompany.joblify.service`)
   - Enter a description
   - Click "Continue" and "Register"
   - Click on the newly created Services ID
   - Enable "Sign in with Apple"
   - Click "Configure" next to "Sign in with Apple"
   - Add your domain and return URLs:
     - Domains: `yourdomain.com`
     - Return URLs: `https://yourdomain.com/api/auth/apple/callback`
   - Click "Save" and "Continue" and "Register"

3. **Create a Key**:
   - Go to "Keys" in the left sidebar
   - Click "+" to create a new key
   - Enter a key name (e.g., "Joblify Apple Sign In Key")
   - Enable "Sign in with Apple"
   - Click "Configure" and select your primary App ID
   - Click "Save" and "Continue" and "Register"
   - Download the key file (.p8) - **You can only download this once!**
   - Note the Key ID shown on the page

4. **Get Your Team ID**:
   - Go to your [Apple Developer Account](https://developer.apple.com/account/)
   - Your Team ID is shown in the top right corner under your name

5. **Convert Private Key to String**:
   ```bash
   # Read the downloaded .p8 file and replace newlines with \n
   cat AuthKey_XXXXXXXXXX.p8 | awk '{printf "%s\\n", $0}'
   ```

6. **Add to Environment Variables**:
   ```bash
   APPLE_CLIENT_ID=com.yourcompany.joblify.service
   APPLE_TEAM_ID=your-team-id-here
   APPLE_KEY_ID=your-key-id-here
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\nHere\n-----END PRIVATE KEY-----"
   ```

### Database Migration

The OAuth integration requires adding new fields to the users table:

```sql
-- Run the migration
npm run db:push
```

Or manually run the migration file:
```bash
psql $DATABASE_URL < migrations/0017_add_oauth_fields.sql
```

This adds:
- `oauth_provider` - Stores the provider name ('google', 'apple', or null)
- `oauth_provider_id` - Stores the provider's unique user ID
- Makes the `password` field nullable (OAuth users don't need passwords)

### Environment Variables

Make sure your `.env` file includes:

```bash
# Required for all auth
SESSION_SECRET=your-random-session-secret-here
BASE_URL=http://localhost:5000

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Apple OAuth (optional)
APPLE_CLIENT_ID=your-apple-client-id-here
APPLE_TEAM_ID=your-apple-team-id-here
APPLE_KEY_ID=your-apple-key-id-here
APPLE_PRIVATE_KEY=your-apple-private-key-here
```

**Note**: If OAuth credentials are not provided, the OAuth buttons will still appear but won't function. For production, ensure all credentials are properly configured.

## How It Works

### User Flow

1. **New User with OAuth**:
   - User clicks "Continue with Google" or "Continue with Apple"
   - User is redirected to the OAuth provider
   - After authentication, user is redirected back to the app
   - A new account is created with the OAuth provider linked
   - Email is automatically verified
   - User is logged in and redirected to the dashboard

2. **Existing User with OAuth**:
   - If a user with the same email already exists, the OAuth provider is linked to their account
   - The existing account's email verification status is updated if the OAuth provider verifies the email
   - User is logged in to their existing account

3. **Password Reset for OAuth Users**:
   - Users who signed up with OAuth cannot use password reset (they don't have a password)
   - They must continue using OAuth to log in
   - If they try to log in with username/password, they'll see a message directing them to use OAuth

### Database Schema

The users table includes these OAuth-related fields:

```typescript
{
  oauthProvider: 'google' | 'apple' | null,  // Which provider authenticated the user
  oauthProviderId: string | null,            // The user's ID from the provider
  password: string | null,                   // Nullable for OAuth users
  emailVerified: boolean,                    // Auto-verified for OAuth users
}
```

### API Endpoints

The following OAuth endpoints are automatically available:

**Google OAuth**:
- `GET /api/auth/google` - Initiates Google OAuth flow
- `GET /api/auth/google/callback` - Google OAuth callback

**Apple OAuth**:
- `POST /api/auth/apple` - Initiates Apple OAuth flow
- `POST /api/auth/apple/callback` - Apple OAuth callback

## Testing

### Development Testing

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Test Google OAuth**:
   - Go to `http://localhost:5000/login`
   - Click "Continue with Google"
   - Complete the Google authentication flow
   - Verify you're redirected to the dashboard
   - Check the database to confirm the user was created with OAuth fields

3. **Test Apple OAuth**:
   - Go to `http://localhost:5000/login`
   - Click "Continue with Apple"
   - Complete the Apple authentication flow
   - Verify you're redirected to the dashboard

### Production Testing

Before deploying to production:

1. Update OAuth redirect URLs in Google Cloud Console and Apple Developer portal
2. Update `BASE_URL` environment variable to your production domain
3. Test the complete OAuth flow in production environment
4. Monitor error logs for any OAuth-related issues

## Security Considerations

1. **Client Secrets**: Never commit OAuth client secrets to version control
2. **HTTPS Required**: OAuth callbacks must use HTTPS in production
3. **Session Security**: Ensure `SESSION_SECRET` is a strong random string
4. **CSRF Protection**: Passport.js includes built-in CSRF protection for OAuth flows
5. **Email Verification**: OAuth providers handle email verification, but always verify the email is present

## Troubleshooting

### "OAuth failed" Error

- **Check redirect URIs**: Ensure they match exactly in OAuth provider settings
- **Verify credentials**: Confirm all environment variables are set correctly
- **Check console logs**: Look for detailed error messages in server logs

### "Email already registered" on OAuth

- This is expected behavior - the user's OAuth provider will be linked to their existing account
- The user should be logged in successfully despite this message

### Apple OAuth Not Working

- **Private Key Format**: Ensure the private key includes newlines as `\n`
- **Services ID vs App ID**: Use the Services ID (not App ID) as `APPLE_CLIENT_ID`
- **Return URL**: Must be `https://` in production (Apple doesn't allow `http://`)

## Future Enhancements

Potential improvements for OAuth integration:

- [ ] Add Microsoft OAuth support
- [ ] Add GitHub OAuth support
- [ ] Allow users to link multiple OAuth providers to one account
- [ ] Add OAuth account unlinking functionality
- [ ] Display OAuth provider in user profile
- [ ] Add "Continue with..." buttons to account settings

## Support

For issues or questions about OAuth integration:
1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify all environment variables are correctly set
4. Contact support@joblifyai.com for additional assistance
