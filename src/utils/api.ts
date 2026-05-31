import { getCsrfHeaders } from './csrf';

let isRefreshing = false;
let refreshSubscribers: ((token: boolean) => void)[] = [];

function subscribeTokenRefresh(cb: (token: boolean) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(success: boolean) {
  refreshSubscribers.forEach(cb => cb(success));
  refreshSubscribers = [];
}

let cachedCsrfToken: string | null = null;

export async function fetchCsrfToken(forceRefresh = false) {
  if (!cachedCsrfToken || forceRefresh) {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/csrf`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        cachedCsrfToken = data.token;
      }
    } catch (e) {
      console.error('Failed to fetch CSRF token', e);
    }
  }
  return cachedCsrfToken;
}

export function clearCsrfToken() {
  cachedCsrfToken = null;
}

/**
 * A custom wrapper around fetch that automatically handles 401 Unauthorized
 * by attempting to refresh the JWT session.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  let token = null;
  if (needsCsrf) {
    token = await fetchCsrfToken();
  }

  // Ensure credentials are sent by default for session management
  const fetchOptions: RequestInit = {
    ...options,
    credentials: options.credentials || 'include',
    headers: {
      ...options.headers,
      ...(token ? { 'X-XSRF-TOKEN': token } : {})
    }
  };

  const response = await fetch(url, fetchOptions);

  // If unauthorized, attempt to refresh
  if (response.status === 401 && !url.includes('/auth/refresh')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            ...(cachedCsrfToken ? { 'X-XSRF-TOKEN': cachedCsrfToken } : {})
          },
          credentials: 'include'
        });

        if (refreshResponse.ok) {
          onRefreshed(true);
          isRefreshing = false;
          // Retry the original request
          return fetch(url, fetchOptions);
        } else {
          onRefreshed(false);
          isRefreshing = false;
        }
      } catch (e) {
        onRefreshed(false);
        isRefreshing = false;
      }
    } else {
      // Wait for the ongoing refresh to finish
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((success) => {
          if (success) {
            resolve(fetch(url, fetchOptions));
          } else {
            resolve(response); // Return original 401 if refresh failed
          }
        });
      });
    }
  }

  return response;
}
