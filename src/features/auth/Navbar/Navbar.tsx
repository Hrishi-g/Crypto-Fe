import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCsrfHeaders } from "../../../utils/csrf";
import "./Navbar.css";

interface NavbarProps {
  user: any;
  setUser: (user: any) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isLoginPage = location.pathname === "/login";

  const handleLogout = async () => {
    await fetch("http://localhost:8080/auth/logout", {
      method: "POST",
      headers: {
        ...getCsrfHeaders()
      },
      credentials: "include",
    });
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="navbar" style={{position: 'fixed', width: '100%', boxSizing: 'border-box'}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div 
          className="logo" 
          onClick={() => {
            navigate("/");
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          style={{cursor: 'pointer', margin: 0}}
        >
          CRYPTX
        </div>
        {location.pathname !== '/markets' && (
          <button
            className="btn-market"
            onClick={() => navigate('/markets')}
          >
            Markets
          </button>
        )}
      </div>

      <div className="nav-auth" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user ? (
          <>
            <div 
              onClick={() => navigate(`/profile/${user.username || 'user'}`)}
              style={{
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, #bd34fe 0%, #41d1ff 100%)', 
                color: 'white', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                boxShadow: '0 4px 10px rgba(189, 52, 254, 0.3)'
              }}
              title="User Profile"
            >
              {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <button
              className="btn-main btn-outline"
              onClick={handleLogout}
              style={{padding: '0.6rem 1.5rem'}}
            >
              Logout
            </button>
          </>
        ) : (
          <button
            className="btn-main btn-primary-gradient"
            onClick={() => navigate(isLoginPage ? "/signup" : "/login")}
            style={{padding: '0.6rem 1.5rem'}}
          >
            {isLoginPage ? "Register" : "Login"}
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

