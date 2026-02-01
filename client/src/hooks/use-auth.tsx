import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { clearStoredUser, getStoredUser, setStoredUser, type StoredUser } from "@/lib/auth-storage";

interface User {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setStoredUser(data.user as StoredUser);
      } else {
        setUser(null);
        clearStoredUser();
      }
    } catch {
      setUser(null);
      clearStoredUser();
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      queryClient.clear();
      setLocation("/dashboard");
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Login failed");
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }
      setUser(data.user);
      setStoredUser(data.user as StoredUser);
      queryClient.clear();
      setLocation("/onboarding");
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
