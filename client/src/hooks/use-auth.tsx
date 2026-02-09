import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  clearStoredUser, 
  getStoredUser, 
  setStoredUser, 
  getStoredTokens, 
  setStoredTokens, 
  clearStoredTokens,
  isTokenExpired,
  type StoredUser,
  type Auth0Tokens
} from "@/lib/auth-storage";

interface User {
  id: string;
  name?: string;
  username: string;
  email: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string, intro?: string, skills?: any[]) => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Token refresh function
  const refreshAccessToken = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens || !tokens.refreshToken) {
      return false;
    }

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        const newTokens: Auth0Tokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || tokens.refreshToken,
          idToken: data.idToken,
          expiresAt: Date.now() + 3600 * 1000, // 1 hour
        };
        setStoredTokens(newTokens);
        return true;
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
    
    return false;
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      // Check if we have tokens and if they're expired
      const tokens = getStoredTokens();
      if (tokens && isTokenExpired(tokens)) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setUser(null);
          clearStoredUser();
          clearStoredTokens();
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch("/api/auth/me", {
        credentials: "include",
        headers: tokens?.accessToken ? {
          "Authorization": `Bearer ${tokens.accessToken}`
        } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setStoredUser(data.user as StoredUser);
      } else {
        setUser(null);
        clearStoredUser();
        clearStoredTokens();
      }
    } catch {
      setUser(null);
      clearStoredUser();
      clearStoredTokens();
    } finally {
      setIsLoading(false);
    }
  }, [refreshAccessToken]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      setUser(data.user);
      setStoredUser(data.user as StoredUser);
      
      // Store Auth0 tokens if present
      if (data.accessToken) {
        const tokens: Auth0Tokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          idToken: data.idToken,
          expiresAt: Date.now() + 3600 * 1000, // 1 hour
        };
        setStoredTokens(tokens);
      }
      
      queryClient.clear();
      setLocation("/dashboard");
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Login failed");
    }
  };

  const register = async (email: string, password: string, name?: string, intro?: string, skills?: any[]) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, intro, skills }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      setUser(data.user);
      setStoredUser(data.user as StoredUser);
      queryClient.clear();
      
      // Navigate based on whether profile is complete
      if (intro && skills && skills.length > 0) {
        setLocation("/verify-email");
      } else {
        setLocation("/onboarding");
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Registration failed");
    }
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch {
    }
    setUser(null);
    clearStoredUser();
    clearStoredTokens();
    queryClient.clear();
    setLocation("/login");
  };

  const resendVerification = async () => {
    const response = await apiRequest("POST", "/api/auth/resend-verification", {});
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to resend verification");
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
