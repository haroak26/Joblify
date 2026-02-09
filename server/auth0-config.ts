import { ManagementClient, AuthenticationClient } from "auth0";

// Auth0 configuration
export const auth0Config = {
  domain: process.env.AUTH0_DOMAIN || "",
  clientId: process.env.AUTH0_CLIENT_ID || "",
  clientSecret: process.env.AUTH0_CLIENT_SECRET || "",
  audience: process.env.AUTH0_AUDIENCE || "",
  callbackURL: process.env.AUTH0_CALLBACK_URL || "http://localhost:5000/api/auth/callback",
  logoutURL: process.env.AUTH0_LOGOUT_URL || "http://localhost:5000",
  managementApiClientId: process.env.AUTH0_MANAGEMENT_API_CLIENT_ID || "",
  managementApiClientSecret: process.env.AUTH0_MANAGEMENT_API_CLIENT_SECRET || "",
};

// Validate Auth0 configuration
export function validateAuth0Config(): boolean {
  const required = [
    "AUTH0_DOMAIN",
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_AUDIENCE",
  ];
  
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`[Auth0] Missing required environment variables: ${missing.join(", ")}`);
    console.warn("[Auth0] Authentication will fall back to session-based auth");
    return false;
  }
  
  return true;
}

// Auth0 Management API client (for user operations)
let managementClient: ManagementClient | null = null;

export function getManagementClient(): ManagementClient {
  if (!managementClient) {
    // Check if we have dedicated management API credentials
    if (auth0Config.managementApiClientId && auth0Config.managementApiClientSecret) {
      managementClient = new ManagementClient({
        domain: auth0Config.domain,
        clientId: auth0Config.managementApiClientId,
        clientSecret: auth0Config.managementApiClientSecret,
      });
    } else {
      // Fall back to using the main application credentials
      managementClient = new ManagementClient({
        domain: auth0Config.domain,
        clientId: auth0Config.clientId,
        clientSecret: auth0Config.clientSecret,
      });
    }
  }
  return managementClient;
}

// Auth0 Authentication API client (for login/authentication)
let authenticationClient: AuthenticationClient | null = null;

export function getAuthenticationClient(): AuthenticationClient {
  if (!authenticationClient) {
    authenticationClient = new AuthenticationClient({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      clientSecret: auth0Config.clientSecret,
    });
  }
  return authenticationClient;
}

// Helper to get Auth0 user ID from local user ID
// In a production app, you'd want to store this mapping in your database
export function getAuth0UserId(localUserId: string): string {
  // Auth0 user IDs have the format: auth0|{unique-id}
  // For now, we'll use the local user ID as part of the Auth0 ID
  return `auth0|${localUserId}`;
}

// Helper to extract local user ID from Auth0 user ID
export function getLocalUserId(auth0UserId: string): string {
  // Remove the 'auth0|' prefix
  return auth0UserId.replace(/^auth0\|/, "");
}
