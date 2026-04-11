import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { getCsrfHeaders } from '../../../utils/csrf';
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

  useEffect(() => {
    const fetchUserProfile = async () => {
        try {
            const res = await fetch(`http://localhost:8080/user/profile`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setFormData({
                    username: data.username || '',
                    totalAmount: data.totalAmount || 0,
                    firstName: data.firstName || '',
                    lastName: data.lastName || '',
                    email: data.email || '',
                    dob: data.dob || ''
                });
            } else {
                 console.error("404 or other error fetching profile with username", username);
            }
        } catch (e) {
            console.error("Failed to fetch user profile", e);
        }
    };
    
    if (username) {
        fetchUserProfile();
    }
  }, [username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:8080/user/update/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeaders()
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      setIsEditing(false);
      setError(null);
      setSuccessMessage('User updated successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
      
      if (user) {
        setUser({ ...user, ...formData });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="user-profile-container">
      <div className="user-profile-card">
        {showWallet ? (
          <WalletManager 
            balance={formData.totalAmount || 0} 
            userId={user?.id}
            onClose={() => setShowWallet(false)} 
            onUpdateBalance={(newBal) => setFormData({...formData, totalAmount: newBal})} 
          />
        ) : (
          <>
            <h2>User Profile</h2>
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
            <form onSubmit={handleSubmit} className="profile-form-grid">
              <div className="form-group">
                <label>Username:</label>
                <input 
                  type="text" 
                  name="username" 
                  value={formData.username} 
                  disabled={true} 
                />
              </div>
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Total Balance:</label>
                  <button type="button" onClick={() => setShowWallet(true)} style={{ background: 'var(--glass)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontSize: '0.8rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Manage
                  </button>
                </div>
                <input 
                  type="text" 
                  name="totalAmount" 
                  value={new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(formData.totalAmount || 0)} 
                  disabled={true} 
                />
              </div>
              <div className="form-group">
            <label>First Name:</label>
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
            <label>Last Name:</label>
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
            <label>Email:</label>
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
            <label>Date of Birth:</label>
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
                <button type="submit" className="btn-main btn-primary-gradient">Save</button>
                <button type="button" className="btn-main btn-outline" onClick={() => {
                  setIsEditing(false);
                  // Reset form to user state or do nothing
                }}>Cancel</button>
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
                Edit
              </button>
            )}
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
