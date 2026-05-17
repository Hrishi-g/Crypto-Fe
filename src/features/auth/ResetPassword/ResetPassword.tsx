import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, EyeOff, Eye } from 'lucide-react';
import '../Login/Login.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setMessage({ type: 'error', text: 'Invalid or missing reset token.' });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    if (password.length < 6) {
      setMessage({ type: 'error', text: "Password must be at least 6 characters long." });
      return;
    }
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch(`http://localhost:8080/auth/reset-password?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: password
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = errorText;
        try {
            const errObj = JSON.parse(errorText);
            errorMessage = errObj.message || errorText;
        } catch(e) {}
        throw new Error(errorMessage || 'Failed to reset password');
      }

      setMessage({ type: 'success', text: "Password reset successfully! Redirecting to login..." });
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="logo-text">CRYPTX</div>
        <header className="auth-header">
          <h1>Create New Password</h1>
          <p>Enter your new password below</p>
        </header>

        {message && (
          <div className={`auth-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-group">
            <label><Lock size={16} /> New Password</label>
            <div className="auth-input-container">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                disabled={!token}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-toggle">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-group">
            <label><Lock size={16} /> Confirm Password</label>
            <div className="auth-input-container">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={!token}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-toggle">
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-main btn-primary-gradient auth-submit" disabled={loading || !token}>
            {loading ? <Loader2 className="animate-spin" size={20} style={{ margin: '0 auto' }} /> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
