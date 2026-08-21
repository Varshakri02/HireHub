// Notification inbox, backed by the notifications table. Rows arrive live over
// the socket; opening the page marks everything read.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../socket.js";
import Avatar from "../components/Avatar.jsx";
import { timeAgo } from "../util.js";

// How each notification type renders. `link` is where clicking it goes.
// Keep the keys in sync with TYPES in server/src/notifications-store.js.
const KIND = {
  post_like: {
    ico: "thumb_up",
    text: (n) => <><b>{n.actor_name}</b> liked your post</>,
    link: () => "/",
  },
  post_comment: {
    ico: "mode_comment",
    text: (n) => (
      <>
        <b>{n.actor_name}</b> commented on your post
        {n.body ? <span className="muted">: “{n.body}”</span> : null}
      </>
    ),
    link: () => "/",
  },
  connection_request: {
    ico: "person_add",
    text: (n) => <><b>{n.actor_name}</b> wants to connect</>,
    link: () => "/network",
  },
  connection_accepted: {
    ico: "how_to_reg",
    text: (n) => <><b>{n.actor_name}</b> accepted your invitation</>,
    link: () => "/network",
  },
  application_received: {
    ico: "assignment_ind",
    text: (n) => (
      <><b>{n.actor_name}</b> applied to your posting <b>{n.body}</b></>
    ),
    link: (n) => `/jobs/${n.entity_id}/manage`,
  },
  application_status: {
    ico: "assignment",
    text: (n) => {
      // body is "<job title>|<status>" — see applications.js.
      const [title, status] = String(n.body || "").split("|");
      return (
        <>
          Your application to <b>{title}</b> is{" "}
          <span className={`status-pill status-${status}`}>{status}</span>
        </>
      );
    },
    link: (n) => `/jobs/${n.entity_id}`,
  },
};

const FALLBACK = {
  ico: "notifications",
  text: (n) => <>{n.body || "New activity"}</>,
  link: () => "/",
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .get("/notifications")
      .then((r) => {
        if (!alive) return;
        setItems(r.data);
        // Viewing the list is reading it — clear the badge, but keep the unread
        // highlight on this render so you can still see what is new.
        if (r.data.some((n) => !n.read)) api.put("/notifications/read-all").catch(() => {});
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [user]);

  // Live rows while the page is open.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (n) => setItems((cur) => [n, ...cur]);
    socket.on("notification:new", onNew);
    return () => socket.off("notification:new", onNew);
  }, []);

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <div className="spread" style={{ alignItems: "baseline" }}>
        <h2>Notifications</h2>
        {items.length > 0 && <span className="muted tiny">{items.length} total</span>}
      </div>
      {loading ? (
        <div className="spinner">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card center muted">
          Nothing yet. Post something, connect with people, or apply to a job.
        </div>
      ) : (
        items.map((n) => {
          const k = KIND[n.type] || FALLBACK;
          return (
            <Link to={k.link(n)} key={n.id}>
              <div className={`card row notif-row ${n.read ? "" : "unread"}`}>
                {n.actor_id ? (
                  <Avatar user={{ name: n.actor_name, avatar_url: n.actor_avatar }} size={40} />
                ) : (
                  <div className="notif-ico"><span className="material-symbols-outlined">{k.ico}</span></div>
                )}
                <div className="grow">
                  {k.text(n)}
                  <div className="muted tiny notif-kind">
                    <span className="material-symbols-outlined ui-ico">{k.ico}</span>
                    {n.type.replace(/_/g, " ")}
                  </div>
                </div>
                <div className="muted tiny">{timeAgo(n.created_at)}</div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
