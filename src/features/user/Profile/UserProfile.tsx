import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useLocation } from 'react-router-dom';
import { User, Mail, Calendar, Wallet, Shield, CheckCircle, AlertCircle, X, Plus, Minus, Settings } from 'lucide-react';
import { getCsrfHeaders } from '../../../utils/csrf';
import { apiFetch } from '../../../utils/api';
import WalletManager from './WalletManager';
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
  const { username } = useParams<{ username: string }>();
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

  const fetchUserProfile = async () => {
      try {
          const res = await apiFetch(`http://localhost:8080/user/profile`);
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
    if (username) {
        fetchUserProfile();
    }
  }, [username]);

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
    try {
      const response = await apiFetch(`http://localhost:8080/user/update/profile`, {
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
      
      if (user) {
        setUser({ ...user, ...formData });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getInitials = () => {
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName[0]}${formData.lastName[0]}`;
    }
    return formData.username?.[0] || 'U';
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-card">
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
                      onChange={handleChange} 
                      disabled={!isEditing} 
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
                </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
