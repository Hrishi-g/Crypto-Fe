const originalFetch = window.fetch;

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onRefreshed = (token: string) => {
  refreshSubscribers.map(cb => cb(token));
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

window.fetch = async (...args) => {
  const [resource] = args;
  
  // Skip auth endpoints that shouldn't trigger a refresh
  if (typeof resource === 'string' && (resource.includes('/auth/refresh') || resource.includes('/auth/login') || resource.includes('/auth/logout'))) {
    return originalFetch(...args);
  }
  if (resource instanceof Request && (resource.url.includes('/auth/refresh') || resource.url.includes('/auth/login') || resource.url.includes('/auth/logout'))) {
    return originalFetch(...args);
  }

  const response = await originalFetch(...args);

  // If the response is 401 Unauthorized, try to refresh the token
  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        // Call the refresh token endpoint
        const refreshResponse = await originalFetch('http://localhost:8080/auth/refresh', {
          method: 'POST', // or 'GET' depending on backend, usually POST, but could be GET. Assuming POST.
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (refreshResponse.ok) {
          isRefreshing = false;
          onRefreshed('success');
          refreshSubscribers = [];

          // Retry the original request
          return originalFetch(...args);
        } else {
          isRefreshing = false;
          refreshSubscribers = [];
          
          // Optional: handle logout if refresh fails, e.g. reload or redirect to login.
          // window.location.href = '/login';
          return response; 
        }
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        return response;
      }
    } else {
      // Wait for the token to refresh and then retry the request
      return new Promise<Response>((resolve) => {
        addRefreshSubscriber(() => {
          resolve(originalFetch(...args));
        });
      });
    }
  }

  return response;
};
