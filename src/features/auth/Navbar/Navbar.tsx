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
        <div className="logo" onClick={() => navigate("/")} style={{cursor: 'pointer', margin: 0}}>
          CRYPTX
        </div>
        {location.pathname === '/' && (
          <button
            className="btn-market"
            onClick={() => navigate('/markets')}
          >
            Markets
          </button>
        )}
        {location.pathname === '/' && (
          <button
            className="btn-market"
            onClick={() => navigate('/')}
          >
           Home
          </button>
        )}
      </div>

      <div className="nav-auth" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user ? (
          <button
            className="btn-main btn-outline"
            onClick={handleLogout}
            style={{padding: '0.6rem 1.5rem'}}
          >
            Logout
          </button>
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

