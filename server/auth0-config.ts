import { ManagementClient, AuthenticationClient } from "auth0";

export const auth0Config = {
  domain: process.env.AUTH0_DOMAIN!,
  clientId: process.env.AUTH0_CLIENT_ID!,
  clientSecret: process.env.AUTH0_CLIENT_SECRET!,
  audience: process.env.AUTH0_AUDIENCE!,
};

export function validateAuth0Config(): boolean {
  return !!(
    auth0Config.domain &&
    auth0Config.clientId &&
    auth0Config.clientSecret &&
    auth0Config.audience
  );
}

let managementClient: ManagementClient | null = null;
let authenticationClient: AuthenticationClient | null = null;

export function getManagementClient(): ManagementClient {
  if (!managementClient) {
    managementClient = new ManagementClient({
      domain: auth0Config.domain,
      clientId: auth0Config.clientId,
      clientSecret: auth0Config.clientSecret,
    });
  }
  return managementClient;
}

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
