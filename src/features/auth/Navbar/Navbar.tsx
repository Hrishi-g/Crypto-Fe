import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCsrfHeaders } from "../../../utils/csrf";
import { PieChart, History, BarChart3, LogOut, Menu, X } from "lucide-react";
import "./Navbar.css";

interface NavbarProps {
  user: any;
  setUser: (user: any) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const isLoginPage = location.pathname === "/login";

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8080/auth/logout", {
        method: "POST",
        headers: {
          ...getCsrfHeaders()
        },
        credentials: "include",
      });
      setUser(null);
      setShowLogoutModal(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      <nav className="navbar" style={{position: 'fixed', width: '100%', boxSizing: 'border-box', zIndex: 100}}>
        <div className="nav-container">
          <div 
            className="logo" 
            onClick={() => {
              navigate("/");
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setIsMenuOpen(false);
            }} 
            style={{cursor: 'pointer', margin: 0}}
          >
            CRYPTX
          </div>

          <div className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </div>
        </div>

        <div className={`nav-auth desktop-nav ${user ? 'logged-in' : ''}`}>
          {user ? (
            <>
              <div 
                onClick={() => navigate('/markets')}
                
                className="nav-icon-btn"
                style={{background: 'rgba(99, 102, 241, 0.1)', 
                  color: '#6366f1'}}
                title="Market Explorer"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'}}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'}}
              >
                <BarChart3 size={20} />
              </div>
              <div 
                onClick={() => navigate('/portfolio')}
                style={{background: 'rgba(189, 52, 254, 0.1)', 
                  color: '#bd34fe'}}
                className="nav-icon-btn"
                title="My Portfolio"
                 onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(189, 52, 254, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'}}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(189, 52, 254, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'}}
              >
                <PieChart size={20} />
              </div>
              <div 
                onClick={() => navigate('/wallet/history')}
                style={{background: 'rgba(65, 209, 255, 0.1)', 
                  color: '#41d1ff'}}
                className="nav-icon-btn"
                title="Transaction History"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(65, 209, 255, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'}}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(65, 209, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'}}
              >
                <History size={20} />
              </div>
              <div 
                onClick={() => navigate(`/profile/${user.username || 'user'}`)}
                className="profile-avatar"
                title="User Profile"
              >
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div 
                onClick={() => setShowLogoutModal(true)}
                style={{borderRadius: '12px', 
                  background: 'rgba(65, 209, 255, 0.1)', 
                  color: 'gray' }}
                className="nav-icon-btn"
                title="Logout"
                 onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(65, 209, 255, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)',e.currentTarget.style.color = 'red'}}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(65, 209, 255, 0.1)'; e.currentTarget.style.transform = 'translateY(0)',e.currentTarget.style.color = 'gray'}}

              >
                <LogOut size={20} />
              </div>
            </>
          ) : (
            <button
              className="btn-main btn-primary-gradient"
              onClick={() => navigate(isLoginPage ? "/signup" : "/login")}
            >
              {isLoginPage ? "Register" : "Login"}
            </button>
          )}
        </div>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          {user ? (
            <div className="mobile-menu-content">
              <div 
                className="mobile-nav-item profile-item"
                onClick={() => {
                  navigate(`/profile/${user.username || 'user'}`);
                  setIsMenuOpen(false);
                }}
              >
                <div className="profile-avatar-small">
                  {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>Profile</span>
              </div>
              
              <div 
                className="mobile-nav-item"
                onClick={() => {
                  navigate('/portfolio');
                  setIsMenuOpen(false);
                }}
                style={{ 
                  color: '#bd34fe'}}
              >
                <PieChart size={20} />
                <span>Portfolio</span>
              </div>

              <div 
                className="mobile-nav-item"
                onClick={() => {
                  navigate('/markets');
                  setIsMenuOpen(false);
                }}
                 style={{ 
                  color: '#6366f1'}}
              >
                <BarChart3 size={20} />
                <span>Market Explorer</span>
              </div>

              <div 
                className="mobile-nav-item"
                onClick={() => {
                  navigate('/wallet/history');
                  setIsMenuOpen(false);
                }}
                style={{
                  color: '#41d1ff'}}
              >
                <History size={20} />
                <span>History</span>
              </div>

              <div 
                className="mobile-nav-item logout-item"
                onClick={() => {
                  setShowLogoutModal(true);
                  setIsMenuOpen(false);
                }}
                style={{
                  color: 'red'}}
              >
                <LogOut size={20} />
                <span>Logout</span>
              </div>
            </div>
          ) : (
            <div className="mobile-menu-content">
              <button
                className="btn-main btn-primary-gradient"
                onClick={() => {
                  navigate(isLoginPage ? "/signup" : "/login");
                  setIsMenuOpen(false);
                }}
                style={{width: '100%', marginTop: '1rem'}}
              >
                {isLoginPage ? "Register" : "Login"}
              </button>
            </div>
          )}
        </div>
      </nav>

      {showLogoutModal && (
        <div className="modal-overlay" onClick={() => setShowLogoutModal(false)}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out? You will need to login again to access your portfolio.</p>
            <div className="modal-actions">
              <button 
                className="btn-main btn-outline" 
                onClick={() => setShowLogoutModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn-main btn-primary-gradient" 
                onClick={handleLogout}
                style={{ flex: 1 }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

