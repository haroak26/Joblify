import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getStoredTokens } from "./auth-storage";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      throw new Error(`${res.status}: ${text || res.statusText}`);
    }
    
    // Handle email verification required
    if (res.status === 403 && errorData.code === 'EMAIL_NOT_VERIFIED') {
      window.location.href = '/verify-email';
      throw new Error(errorData.message || 'Email verification required');
    }
    
    // Handle unauthorized - DON'T redirect for protected routes, let ProtectedRoute handle it
    // Only throw the error so the component can decide what to do
    if (res.status === 401) {
      throw new Error(errorData.error || errorData.message || 'Authentication required');
    }
    
    throw new Error(errorData.error || errorData.message || `${res.status}: ${text || res.statusText}`);
  }
}

function getAuthHeaders(): HeadersInit {
  const tokens = getStoredTokens();
  if (tokens?.accessToken) {
    return {
      "Authorization": `Bearer ${tokens.accessToken}`
    };
  }
  return {};
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(url, {
    method,
    headers: data ? { 
      "Content-Type": "application/json",
      ...authHeaders
    } : authHeaders,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = getAuthHeaders();
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: authHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
