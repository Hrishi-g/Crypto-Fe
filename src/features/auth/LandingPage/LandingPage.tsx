import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from '../UserLanding/AdminDashboard';
import UserDashboard from '../UserLanding/UserDashboard';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:8080/auth/check', {
          credentials: 'include' // Crucial for sending the jwt_token
        });
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          navigate('/login'); // Redirect to login if 401 Unauthorized
        }
      } catch (err) {
        console.error("Fetch error:", err);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  if (loading) return <div className="loading">Initializing Secure Session...</div>;

  // Render the entire page based on the ROLE_ADMIN or user role
  return userData?.role === 'ADMIN' 
    ? <AdminDashboard user={userData} /> 
    : <UserDashboard user={userData} />;
};

export default LandingPage;