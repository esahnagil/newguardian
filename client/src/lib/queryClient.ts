import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Yardımcı fonksiyon: snake_case -> camelCase dönüşümü
function toCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  return Object.keys(obj).reduce((acc, key) => {
    // snake_case anahtarı camelCase'e dönüştür
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    // Değer bir nesne ise, özyinelemeli olarak dönüştür
    acc[camelKey] = toCamelCase(obj[key]);
    
    return acc;
  }, {} as Record<string, any>);
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  options?: RequestInit & { body?: any },
): Promise<T> {
  const requestOptions: RequestInit = {
    method,
    ...options,
    headers: {
      ...(options?.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
  };
  
  if (options?.body) {
    requestOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, requestOptions);

  await throwIfResNotOk(res);
  try {
    if (method === 'DELETE' || url.includes('/status')) {
      return {} as T; // Empty response for operations without content
    }
    // API yanıtını al ve camelCase'e dönüştür
    const jsonData = await res.json();
    return toCamelCase(jsonData) as T;
  } catch (e) {
    console.error("Error parsing JSON response:", e);
    return {} as T;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    // API yanıtını al ve camelCase'e dönüştür
    const jsonData = await res.json();
    return toCamelCase(jsonData);
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
