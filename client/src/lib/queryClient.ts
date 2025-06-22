import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let errorData;
    try {
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: text || res.statusText };
    }
    
    // Create enhanced error object with all response data
    const error = new Error(errorData.message || `${res.status}: ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).errorType = errorData.errorType;
    (error as any).upgradeAvailable = errorData.upgradeAvailable;
    (error as any).resetDate = errorData.resetDate;
    (error as any).daysUntilReset = errorData.daysUntilReset;
    (error as any).upgrade = errorData.upgrade;
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retryCount = 0
): Promise<any> {
  const isFormData = data instanceof FormData;
  const headers: Record<string, string> = {};
  
  // Get fresh session with automatic refresh
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    // Attempt to refresh session if there's an error
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData?.session?.access_token) {
      headers['Authorization'] = `Bearer ${refreshData.session.access_token}`;
    }
  } else if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  // If no token is available, this request will fail with 401
  if (!headers['Authorization']) {
    console.error('No valid session token available for:', url);
  }
  
  // Add content type for JSON requests
  if (data && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? (isFormData ? data : JSON.stringify(data)) : undefined,
    credentials: "include",
  });

  // Handle 401 errors with automatic retry
  if (res.status === 401 && retryCount < 3) {
    // Force session refresh and retry
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData?.session?.access_token) {
      return apiRequest(method, url, data, retryCount + 1);
    }
    
    // If refresh fails, try getting a fresh session
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.access_token) {
      return apiRequest(method, url, data, retryCount + 1);
    }
  }

  await throwIfResNotOk(res);
  
  // Always try to return JSON for API responses
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await res.json();
  }
  
  // For non-JSON responses, try to parse as JSON anyway (in case content-type is missing)
  try {
    const text = await res.text();
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      return JSON.parse(text);
    }
    return { data: text }; // Wrap plain text in an object
  } catch {
    return res; // Return the response object as fallback
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add Supabase access token for authenticated requests
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
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
