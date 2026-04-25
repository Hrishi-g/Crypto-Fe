import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
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

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    mode: 'onSubmit'
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch('http://localhost:8080/auth/login', {
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

        // Call /user/profile to populate backend cache for subsequent API calls
        try {
          const profileRes = await fetch('http://localhost:8080/user/profile', {
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

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="logo-text">CRYPTX</div>
        <header className="auth-header">
          <h1>Welcome Back</h1>
          <p>Login to your secure trading portal</p>
        </header>

        {message && (
          <div className={`auth-message ${message.type}`}>
            {message.text}
          </div>
        )}

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
          </div>

          <button type="submit" className="btn-main btn-primary-gradient auth-submit" disabled={loading}>
            {loading ? 'Processing...' : 'Login Now'}
          </button>

          <footer className="auth-footer">
            <span>Don't have an account?</span>
            <button type="button" onClick={() => navigate('/signup')} className="auth-link">
              Create an Account
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default Login;