import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const [user, setUser] = useState<User | null>(null);
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
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (username: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { username, password });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }
    setUser(data.user);
    queryClient.clear();
    setLocation("/dashboard");
  };

  const register = async (username: string, email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/register", { username, email, password });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Registration failed");
    }
    setUser(data.user);
    queryClient.clear();
    setLocation("/dashboard");
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
    } catch {
    }
    setUser(null);
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
