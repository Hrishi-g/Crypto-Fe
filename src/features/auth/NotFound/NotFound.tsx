import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Timer to redirect after 2 seconds (2000ms)
    const timer = setTimeout(() => {
      navigate('/signup');
    }, 2000);

    return () => clearTimeout(timer); // Cleanup timer if component unmounts
  }, [navigate]);

  return (
    <div className="not-found-wrapper">
      <div className="not-found-card">
        <h1>404</h1>
        <h2>Oops! Page Not Found</h2>
        <p>Redirecting you back to safety in 2 seconds...</p>
        <div className="loading-bar-container">
          <div className="loading-bar-progress"></div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;