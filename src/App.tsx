import { createBrowserRouter, RouterProvider, useLocation, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Signup from './features/auth/Signup/Signup'
import Login from './features/auth/Login/Login'
import Navbar from './features/auth/Navbar/Navbar'
import NotFound from './features/auth/NotFound/NotFound'
import { useState, useEffect } from 'react';
import Home from './features/auth/Home/Home';
import Markets from './features/auth/Markets/Markets';
import CoinDetail from './features/auth/CoinDetail/CoinDetail';
import UserProfile from './features/user/Profile/UserProfile';
import BuyCrypto from './features/auth/BuyCrypto/BuyCrypto';
import Portfolio from './features/user/Portfolio/Portfolio';
import WalletHistory from './features/user/WalletHistory/WalletHistory';


const AppLayout = () => {
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const hideNavbarOn: string[] = [];
  const shouldShowNavbar = !hideNavbarOn.includes(location.pathname);

  useEffect(() => {
    // Scroll to the top of the page whenever the route changes
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { apiFetch } = await import('./utils/api');
        const res = await apiFetch('http://localhost:8080/auth/check');

        if (res.ok) {
          const authData = await res.json();
          let userData = { ...authData };
          
          const profileRes = await apiFetch('http://localhost:8080/user/profile');
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            userData = { ...userData, ...profileData };
          }
          setUser(userData);
        } else {
           setUser(null);
        }
      } catch (err) {
        console.error("Session check failed:", err);
      }
    };
    
    checkSession();
  }, []);

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
        <Outlet context={{ user, setUser }} />
      </motion.div>
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
      { path: "/profile/:username", element: <UserProfile /> },
      { path: "/portfolio", element: <Portfolio /> },
      { path: "/wallet/history", element: <WalletHistory /> },
      { path: "*", element: <NotFound /> }

    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;