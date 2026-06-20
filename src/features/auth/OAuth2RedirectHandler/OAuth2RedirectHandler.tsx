import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useOutletContext } from 'react-router-dom';
import { apiFetch, clearCsrfToken } from '../../../utils/api';

const OAuth2RedirectHandler: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { setUser } = useOutletContext<any>();

  useEffect(() => {
    const code = searchParams.get('code');

    // Security: Immediately clear the auth code from the URL bar to prevent leakage
    if (code) {
      window.history.replaceState({}, document.title, '/');
      
      // Send code to backend to securely exchange for HttpOnly cookies via proxy
      apiFetch(`${import.meta.env.VITE_BACKEND_URL}/auth/oauth2/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      })
      .then(async res => {
        if (res.ok) {
          // Clear CSRF token so a fresh one is fetched for the new session
          clearCsrfToken();

          // Cookies are set. Fetch the fresh user data using the new cookies.
          try {
            const checkRes = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/auth/check?t=${Date.now()}`, { cache: 'no-store' });
            if (checkRes.ok) {
              const authData = await checkRes.json();
              setUser(authData); // Update global state instantly
            }
          } catch (e) {
            // Failed to fetch user session after OAuth exchange silently
          }
          // Navigate instantly without a hard reload
          navigate('/');
        } else {
          setError('Failed to securely store authentication tokens.');
          setTimeout(() => navigate('/login'), 3000);
        }
      })
      .catch(err => {
        // OAuth token handoff failed silently
        setError('Network error during authentication handoff.');
        setTimeout(() => navigate('/login'), 3000);
      });
    } else {
      setError('No authentication token found in the redirect.');
      setTimeout(() => navigate('/login'), 3000);
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      {error ? (
        <>
          <h2 style={{ color: '#e74c3c' }}>Authentication Error</h2>
          <p>{error}</p>
          <p>Redirecting to login...</p>
        </>
      ) : (
        <>
          <h2>Completing Login...</h2>
          <p>Securely exchanging tokens. Please wait.</p>
        </>
      )}
    </div>
  );
};

export default OAuth2RedirectHandler;
