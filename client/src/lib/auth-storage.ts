const AUTH_STORAGE_KEY = "joblify-user";

export interface StoredUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
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

export { AUTH_STORAGE_KEY };
