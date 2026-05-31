import { createBrowserRouter, RouterProvider, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Signup from './features/auth/Signup/Signup'
import Login from './features/auth/Login/Login'
import Navbar from './features/auth/Navbar/Navbar'
import NotFound from './features/auth/NotFound/NotFound'
import { useState, useEffect, useRef } from 'react';
import Home from './features/auth/Home/Home';
import Markets from './features/auth/Markets/Markets';
import CoinDetail from './features/auth/CoinDetail/CoinDetail';
import UserProfile from './features/user/Profile/UserProfile';
import BuyCrypto from './features/auth/BuyCrypto/BuyCrypto';
import Portfolio from './features/user/Portfolio/Portfolio';
import WalletHistory from './features/user/WalletHistory/WalletHistory';
import SetPasswordModal from './features/auth/SetPassword/SetPasswordModal';
import ResetPassword from './features/auth/ResetPassword/ResetPassword';
import OAuth2RedirectHandler from './features/auth/OAuth2RedirectHandler/OAuth2RedirectHandler';

const AppLayout = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuth, setIsAuth] = useState(() => localStorage.getItem('isAuth') === 'true');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const isInitialMount = useRef(true);
  const location = useLocation();
  const hideNavbarOn: string[] = [];
  const shouldShowNavbar = !hideNavbarOn.includes(location.pathname);

  useEffect(() => {
    // Scroll to the top of the page whenever the route changes
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (user) {
      localStorage.setItem('isAuth', 'true');
      setIsAuth(true);
    } else {
      localStorage.removeItem('isAuth');
      setIsAuth(false);
    }
  }, [user]);

  useEffect(() => {

    const checkSession = async () => {
      try {
        const { apiFetch } = await import('./utils/api');
        const res = await apiFetch(`${import.meta.env.VITE_BACKEND_URL}/auth/check?t=${Date.now()}`, {
          cache: 'no-store'
        });

        if (res.ok) {
          const authData = await res.json();
          setUser(authData);
          
          console.log("DEBUG: What is authData?", authData);
          
          if (authData.hasPassword === false && !sessionStorage.getItem('skipPasswordPrompt')) {
            setShowPasswordPrompt(true);
          }
        } else {
           setUser(null);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      }
    };
    
    checkSession();
  }, []);

  // Removed full page loader to allow instant rendering of public pages

  return (
    <div className={`app-container ${user ? "auth-mode" : "guest-mode"}`}>
      {shouldShowNavbar && <Navbar user={user} setUser={setUser} />}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.2, 
          ease: "easeOut"
        }}
        style={{ width: '100%' }}
      >
        <Outlet context={{ user, setUser, isAuth }} />
      </motion.div>
      {showPasswordPrompt && (
        <SetPasswordModal 
          onClose={() => {
            sessionStorage.setItem('skipPasswordPrompt', 'true');
            setShowPasswordPrompt(false);
          }}
          onSuccess={() => {
            setUser({ ...user, password: 'set' }); // mark password as set
            setShowPasswordPrompt(false);
          }}
        />
      )}
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/signup", element: <Signup /> },
      { path: "/login", element: <Login /> },
      { path: "/markets", element: <Markets /> },
      { path: "/coin/:id", element: <CoinDetail /> },
      { path: "/buy/:id", element: <BuyCrypto /> },
      { path: "/profile", element: <UserProfile /> },
      { path: "/portfolio", element: <Portfolio /> },
      { path: "/wallet/history", element: <WalletHistory /> },
      { path: "/reset-password", element: <ResetPassword /> },
      { path: "/oauth2-redirect", element: <OAuth2RedirectHandler /> },
      { path: "*", element: <NotFound /> }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;