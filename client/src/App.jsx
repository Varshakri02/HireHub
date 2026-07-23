import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Feed from "./pages/Feed.jsx";
import Jobs from "./pages/Jobs.jsx";
import JobManage from "./pages/JobManage.jsx";
import Applications from "./pages/Applications.jsx";
import Messages from "./pages/Messages.jsx";
import Profile from "./pages/Profile.jsx";
import Network from "./pages/Network.jsx";
import Notifications from "./pages/Notifications.jsx";
import Admin from "./pages/Admin.jsx";
import Recruiter from "./pages/Recruiter.jsx";
import Landing from "./pages/Landing.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="spinner">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();
  const P = (el) => <Protected>{el}</Protected>;
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={loading ? <div className="spinner">Loading…</div> : user ? P(<Feed />) : <Landing />} />
        <Route path="/jobs" element={P(<Jobs />)} />
        <Route path="/jobs/:id" element={P(<Jobs />)} />
        <Route path="/jobs/:id/manage" element={P(<JobManage />)} />
        <Route path="/applications" element={P(<Applications />)} />
        <Route path="/network" element={P(<Network />)} />
        <Route path="/notifications" element={P(<Notifications />)} />
        <Route path="/messages" element={P(<Messages />)} />
        <Route path="/messages/:userId" element={P(<Messages />)} />
        <Route path="/admin" element={P(<Admin />)} />
        <Route path="/recruiter" element={P(<Recruiter />)} />
        <Route path="/profile/:id" element={P(<Profile />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <Footer />}
    </>
  );
}
