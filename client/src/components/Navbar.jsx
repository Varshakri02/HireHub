// HireHub top navigation: logo, search, icon links with live unread badge.
import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../socket.js";
import api from "../api.js";
import Avatar from "./Avatar.jsx";

const LINKS = [
  { to: "/", ico: "home", label: "Home", end: true },
  { to: "/network", ico: "group", label: "Network" },
  { to: "/jobs", ico: "work", label: "Jobs" },
  { to: "/messages", ico: "chat_bubble", label: "Messaging", key: "messaging" },
  { to: "/notifications", ico: "notifications", label: "Notifications", key: "notifications" },
];

const Ico = ({ name }) => <span className="material-symbols-outlined nav-ico">{name}</span>;

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [notifs, setNotifs] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    api
      .get("/messages")
      .then((r) => setUnread(r.data.reduce((s, c) => s + (c.unread || 0), 0)))
      .catch(() => {});
    api
      .get("/notifications/unread-count")
      .then((r) => setNotifs(r.data.count))
      .catch(() => {});
  }, [user]);

  // The notifications page marks everything read, so clear the badge when the
  // user navigates there rather than waiting for a refetch.
  useEffect(() => {
    if (pathname.startsWith("/notifications")) setNotifs(0);
  }, [pathname]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;
    const onNew = (msg) => {
      if (msg.sender_id !== user.id && !pathname.startsWith("/messages")) {
        setUnread((n) => n + 1);
      }
    };
    // Already sitting on /notifications? The page renders the row itself and marks
    // it read, so don't raise a badge for it.
    const onNotif = () => {
      if (!pathname.startsWith("/notifications")) setNotifs((n) => n + 1);
    };
    socket.on("message:new", onNew);
    socket.on("notification:new", onNotif);
    return () => {
      socket.off("message:new", onNew);
      socket.off("notification:new", onNotif);
    };
  }, [user, pathname]);

  if (!user) return null;

  const links = [
    ...LINKS,
    ...(user.is_recruiter ? [{ to: "/recruiter", ico: "badge", label: "Recruiting" }] : []),
    ...(user.is_admin ? [{ to: "/admin", ico: "shield_person", label: "Admin" }] : []),
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }
  function search(e) {
    e.preventDefault();
    navigate(`/jobs?q=${encodeURIComponent(q)}`);
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="logo">
          <span className="material-symbols-outlined fill">hexagon</span>
          HireHub
        </NavLink>
        <form className="nav-search" onSubmit={search}>
          <span className="search-ico material-symbols-outlined">search</span>
          <input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="nav-links">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav-item">
              <Ico name={l.ico} />
              <span>{l.label}</span>
              {l.key === "messaging" && unread > 0 && <span className="badge">{unread}</span>}
              {l.key === "notifications" && notifs > 0 && <span className="badge">{notifs}</span>}
            </NavLink>
          ))}
          <div className="nav-sep" />
          <NavLink to={`/profile/${user.id}`} className="nav-me">
            <Avatar user={user} size={28} />
            <span>{user.name}</span>
          </NavLink>
          <button className="ghost small" style={{ alignSelf: "center", marginLeft: 8 }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
