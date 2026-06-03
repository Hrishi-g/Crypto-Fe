import React, { useState } from 'react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
import { Lock, Loader2, X, CheckCircle, EyeOff, Eye } from 'lucide-react';
import '../../user/Profile/UserProfile.css'; // to reuse the wallet manager styles

interface SetPasswordModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const SetPasswordModal: React.FC<SetPasswordModalProps> = ({ onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify({ password, confirmPassword })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to set password');
      }

      setSuccess("Password set successfully!");
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(10, 10, 20, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div className="user-profile-card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
        <div className="wallet-manager-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Secure Your Account</h2>
            <button 
              onClick={onClose} 
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="wallet-manager-inner">
            <div style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: '1.5' }}>
              You logged in with OAuth. Please set a password for your account to enable full platform features and alternative login methods.
            </div>

            {error && <div className="error-message" style={{ margin: '1rem 0' }}>{error}</div>}
            {success && <div className="success-message" style={{ margin: '1rem 0' }}><CheckCircle size={18} style={{marginRight: '8px'}}/> {success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label><Lock size={14} /> New Password</label>
                <div className="input-wrapper" style={{ marginTop: '8px' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{ fontSize: '1.1rem', padding: '16px 20px', width: '100%', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="auth-toggle">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                <label><Lock size={14} /> Confirm Password</label>
                <div className="input-wrapper" style={{ marginTop: '8px' }}>
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  
                    style={{ fontSize: '1.1rem', padding: '16px 20px', width: '100%', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                    
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="auth-toggle">
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </button>
                  
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button 
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="btn-main" 
                  style={{ 
                    width: '100%', 
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  Skip for Now
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="btn-main" 
                  style={{ 
                    width: '100%', 
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                    boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)',
                    border: 'none',
                    color: 'white',
                    padding: '16px',
                    borderRadius: '16px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPasswordModal;
