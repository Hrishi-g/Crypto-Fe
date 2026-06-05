import React, { useState, useEffect } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { User, Mail, Calendar, Wallet, Shield, CheckCircle, AlertCircle, X,  Settings } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
import WalletManager from './WalletManager';
import SetPasswordModal from '../../auth/SetPassword/SetPasswordModal';
import './UserProfile.css';

interface UserProfileData {
  username?: string;
  totalAmount?: number;
  firstName: string;
  lastName: string;
  email: string;
  dob: string;
}

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { user, setUser } = useOutletContext<{ user: any, setUser: (u: any) => void }>();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<UserProfileData>({
    username: '',
    totalAmount: 0,
    firstName: '',
    lastName: '',
    email: '',
    dob: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showWallet, setShowWallet] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [originalData, setOriginalData] = useState<UserProfileData | null>(null);
 const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
 const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const fetchUserProfile = async () => {
      try {
          const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/profile`);
          if (res.ok) {
              const data = await res.json();
              const updatedData = {
                  username: data.username || '',
                  totalAmount: data.totalAmount || 0,
                  firstName: data.firstName || '',
                  lastName: data.lastName || '',
                  email: data.email || '',
                  dob: data.dob || ''
              };
              setOriginalData(updatedData);
              setFormData(updatedData);
              if (user) {
                setUser({ ...user, ...updatedData });
              }
          }
      } catch (e) {
          console.error("Failed to fetch user profile", e);
      }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (location.state?.showWallet) {
      setShowWallet(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (originalData) {
      const hasChanged = 
        formData.firstName !== originalData.firstName ||
        formData.lastName !== originalData.lastName ||
        formData.dob !== originalData.dob;

      if (!hasChanged) {
        setIsEditing(false);
        return;
      }
    }

    try {
      const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/user/update/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      setIsEditing(false);
      setError(null);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
      
      setOriginalData(formData);
      
      if (user) {
        setUser({ ...user, ...formData });
        queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      setMessage({ type: 'error', text: 'No email found in profile.' });
      return;
    }
    setMessage(null);
    setIsSendingLink(true);
    try {
      const response = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/auth/send-reset-password-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: formData.email
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Reset link sent to your email!' });
        setTimeout(() => {
          setIsForgotPassword(false);
          setMessage(null);
        }, 3000);
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
      setIsSendingLink(false);
    }
  };

  return (
    <div className="user-profile-container">
      {user?.hasPassword === false && (
        <div className='glass-card user-profile-change-password-btn-prompt' style={{ borderRadius: '25px' }}>
          <span>Want to set your password now? </span>
          <button onClick={() => setShowPasswordModal(true)} className="manage-btn">Set Password</button>
        </div>
      )}
      <div className="glass-card user-profile-card" style={{ borderRadius: '32px' }}>
        {showWallet ? (
          <div className="wallet-manager-container">
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Manage Wallet</h2>
                <button 
                  onClick={() => setShowWallet(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: '#fff', cursor: 'pointer', width: '40px', height: '40px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>
            <WalletManager 
              balance={formData.totalAmount || 0} 
              userId={user?.id}
              onClose={() => setShowWallet(false)} 
              onUpdateBalance={fetchUserProfile} 
            />
          </div>
        ) : isForgotPassword ? (
          <div className="profile-content" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#fff', fontSize: '1.5rem', fontWeight: '700' }}>Reset Your Password</h3>
            <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: '1.6' }}>
              We will send a password reset link to your registered email address:<br/>
              <strong style={{ color: '#fff', display: 'block', marginTop: '0.5rem' }}>{formData.email}</strong>
            </p>
            {message && (
              <div className={`auth-message ${message.type}`} style={{ marginBottom: '2rem', textAlign: 'left' }}>
                {message.text}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn-main btn-outline" 
                onClick={() => { setIsForgotPassword(false); setMessage(null); }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-main btn-primary-gradient" 
                onClick={handleForgotPassword}
                disabled={isSendingLink || message?.type === 'success'}
              >
                {isSendingLink ? 'Sending...' : 'Send Link'}
              </button>
            </div>
          </div>
        ) : (
          <>

            <div className="profile-content">
                {error && <div className="error-message"><AlertCircle size={20} /> {error}</div>}
                {successMessage && <div className="success-message"><CheckCircle size={20} /> {successMessage}</div>}
                
                <form onSubmit={handleSubmit} className="profile-form-grid">
                  <div className="form-group" id="form-group-username">
                    <label><Shield size={14} /> Username</label>
                    <input 
                      type="text" 
                      name="username" 
                      value={formData.username} 
                      disabled={true} 
                    />
                  </div>

                  <div className="form-group">
                    <div className="balance-input-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ margin: 0 }}><Wallet size={14} /> Balance</label>
                          <button type="button" onClick={() => setShowWallet(true)} className="manage-btn">
                            <Settings size={14} /> Manage
                          </button>
                        </div>
                        <input 
                          type="text" 
                          name="totalAmount" 
                          value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(formData.totalAmount || 0)} 
                          disabled={true} 
                          style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80' }}
                        />
                    </div>
                  </div>

                  <div className="form-group">
                    <label><User size={14} /> First Name</label>
                    <input 
                      type="text" 
                      name="firstName" 
                      value={formData.firstName} 
                      onChange={handleChange} 
                      disabled={!isEditing} 
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label><User size={14} /> Last Name</label>
                    <input 
                      type="text" 
                      name="lastName" 
                      value={formData.lastName} 
                      onChange={handleChange} 
                      disabled={!isEditing} 
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label><Mail size={14} /> Email Address</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={formData.email} 
                      disabled={true} 
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label><Calendar size={14} /> Date of Birth</label>
                    <input 
                      type="date" 
                      name="dob" 
                      value={formData.dob} 
                      onChange={handleChange} 
                      disabled={!isEditing} 
                      required
                    />
                  </div>
                  <div className="form-group">
                    <button 
                    type="button" 
                    onClick={() => {
                      setIsForgotPassword(true);
                      setMessage(null);
                    }} 
                    className="btn-main btn-primary-gradient" 
                    style={{ fontSize: '0.85rem' }}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="form-group">
                    <div className="profile-actions">
                      {isEditing ? (
                        <>
                          <button type="button" className="btn-main btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                          <button type="submit" className="btn-main btn-primary-gradient">Save Changes</button>
                        </>
                      ) : (
                        <button 
                          type="button" 
                          className="btn-main btn-primary-gradient" 
                          onClick={(e) => {
                            e.preventDefault();
                            setIsEditing(true);
                          }}
                        >
                          Edit Profile
                        </button>
                      )}
                    </div>
                  </div>
                </form>
            </div>
          </>
        )}
      </div>
      {showPasswordModal && (
        <SetPasswordModal 
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            setSuccessMessage('Password set successfully!');
            setTimeout(() => setSuccessMessage(null), 4000);
            if (user) {
              setUser({ ...user, hasPassword: true });
            }
          }}
        />
      )}
    </div>
  );
};

export default UserProfile;
