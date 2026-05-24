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

/**
 * A custom wrapper around fetch that automatically handles 401 Unauthorized
 * by attempting to refresh the JWT session.
 */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Ensure credentials are sent by default for session management
  const fetchOptions: RequestInit = {
    ...options,
    credentials: options.credentials || 'include',
    headers: {
      ...options.headers,
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
          headers: getCsrfHeaders(),
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
