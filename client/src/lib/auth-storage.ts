const AUTH_STORAGE_KEY = "joblify-user";
const AUTH_TOKENS_KEY = "joblify-auth-tokens";

export interface StoredUser {
  id: string;
  name?: string;
  username: string;
  email: string;
  emailVerified: boolean;
}

export interface Auth0Tokens {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt?: number;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore storage failures
  }
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

export function getStoredTokens(): Auth0Tokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_TOKENS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Auth0Tokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: Auth0Tokens) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // ignore storage failures
  }
}

export function clearStoredTokens() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_TOKENS_KEY);
  } catch {
    // ignore storage failures
  }
}

export function isTokenExpired(tokens: Auth0Tokens): boolean {
  if (!tokens.expiresAt) return false;
  return Date.now() >= tokens.expiresAt;
}

export { AUTH_STORAGE_KEY, AUTH_TOKENS_KEY };
