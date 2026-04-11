import { createBrowserRouter, RouterProvider, useLocation, Outlet } from 'react-router-dom';
import Signup from './features/auth/Signup/Signup'
import Login from './features/auth/Login/Login'
import Navbar from './features/auth/Navbar/Navbar'
import NotFound from './features/auth/NotFound/NotFound'
import LandingPage from './features/auth/LandingPage/LandingPage';
import { useState, useEffect } from 'react';
import Home from './features/auth/Home/Home';
import Markets from './features/auth/Markets/Markets';
import CoinDetail from './features/auth/CoinDetail/CoinDetail';
import UserProfile from './features/user/Profile/UserProfile';

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
        const res = await fetch('http://localhost:8080/auth/check', {
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error("Session check failed, user not logged in:", err);
      }
    };
    checkSession();
  }, []);

  return (
    <div className={`app-container ${user ? "auth-mode" : "guest-mode"}`}>
      {shouldShowNavbar && <Navbar user={user} setUser={setUser} />}
      <Outlet context={{ user, setUser }} />
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
      { path: "/landing", element: <LandingPage /> },
      { path: "/profile/:username", element: <UserProfile /> },
      { path: "*", element: <NotFound /> }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;