import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch, clearCsrfToken } from '../../../utils/api';
import './Login.css';

interface LoginFormData {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useOutletContext<{ setUser: (user: any) => void }>();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Forgot Password states
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    mode: 'onSubmit'
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify(data),
        mode: 'cors',
        credentials: 'include'
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        let userData = null;
        if (contentType && contentType.includes('application/json')) {
            userData = await response.json();
            setUser(userData);
        }

        // Clear CSRF token to fetch a new one for the newly logged-in session
        clearCsrfToken();

        // Call /user/profile to populate backend cache for subsequent API calls
        try {
          const profileRes = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/profile`, {
            method: 'GET',
            credentials: 'include'
          });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setUser((prev: any) => ({ ...prev, ...profileData }));
          }
        } catch (profileErr) {
          console.error('Failed to pre-cache user profile:', profileErr);
        }
        
        setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        const contentType = response.headers.get('content-type');
        let errorText = 'Invalid username or password';
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorText = errorData.message || JSON.stringify(errorData);
          } else {
            const textData = await response.text();
            errorText = textData || errorText;
          }
        } catch (e) {
          console.error("Error parsing response:", e);
        }

        setMessage({ type: 'error', text: errorText });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/send-reset-password-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: resetEmail
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Reset link sent! Redirecting to home...' });
        setResetEmail('');
        setTimeout(() => navigate('/'), 2000);
      } else {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
          const errObj = JSON.parse(errorText);
          errorMessage = errObj.message || errorText;
        } catch (e) {}
        setMessage({ type: 'error', text: errorMessage || 'Failed to send reset link.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="logo-text">CRYPTX</div>
        <header className="auth-header">
          <h1>{isForgotPassword ? 'Reset Password' : 'Welcome Back'}</h1>
          <p>{isForgotPassword ? 'Enter your email to receive a reset link' : 'Login to your secure trading portal'}</p>
        </header>

        {message && (
          <div className={`auth-message ${message.type}`}>
            {message.text}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="auth-group">
              <label><User size={16} /> Email Address</label>
              <div className="auth-input-container">
                <input 
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email" 
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-main btn-primary-gradient auth-submit" disabled={loading || message?.type === 'success'}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <footer className="auth-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={() => {
                  setIsForgotPassword(false);
                  setMessage(null);
                }} 
                className="auth-link" 
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Back to Login
              </button>
            </footer>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="auth-group">
              <label><User size={16} /> Username</label>
              <div className="auth-input-container">
                <input 
                  {...register("username", { required: true })} 
                  placeholder="Enter your username" 
                  className={errors.username ? 'error' : ''}
                />
              </div>
            </div>

            <div className="auth-group">
              <label><Lock size={16} /> Password</label>
              <div className="auth-input-container">
                <input 
                  type={showPassword ? "text" : "password"} 
                  {...register("password", { required: true })} 
                  placeholder="Enter your password"
                  className={errors.password ? 'error' : ''}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-toggle">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsForgotPassword(true);
                    setMessage(null);
                  }} 
                  className="auth-link" 
                  style={{ fontSize: '0.85rem' }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>

            <button type="submit" className="btn-main btn-primary-gradient auth-submit" disabled={loading}>
              {loading ? 'Processing...' : 'Login Now'}
            </button>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            <button 
              type="button" 
              className="oauth-button google"
              onClick={() => window.location.href = `${import.meta.env.VITE_AUTH_URL}/oauth2/authorization/google`}
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              Continue with Google
            </button>

            <footer className="auth-footer">
              <span>Don't have an account?</span>
              <button type="button" onClick={() => navigate('/signup')} className="auth-link">
                Create an Account
              </button>
            </footer>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;