// Activity summary derived from real data: application statuses + applicants on your jobs.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { timeAgo } from "../util.js";

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/applications/mine").then((r) => r.data).catch(() => []),
      api.get("/applications/received").then((r) => r.data).catch(() => []),
    ]).then(([apps, received]) => {
      const feed = [];
      for (const a of apps) {
        feed.push({
          when: a.created_at,
          icon: a.status === "accepted" ? "celebration" : a.status === "rejected" ? "cancel" : "assignment",
          text: <>Your application to <b>{a.job_title}</b> at {a.job_company} is <span className={`status-pill status-${a.status}`}>{a.status}</span></>,
          to: `/jobs/${a.job_id}`,
        });
      }
      // One entry per applicant, stamped with when they applied — not when the job
      // was posted, which buried new applications under the posting's own date.
      for (const a of received) {
        feed.push({
          when: a.created_at,
          icon: "person_add",
          text: <><b>{a.applicant_name}</b> applied to your posting <b>{a.job_title}</b> <span className={`status-pill status-${a.status}`}>{a.status}</span></>,
          to: `/jobs/${a.job_id}/manage`,
        });
      }
      feed.sort((a, b) => (a.when < b.when ? 1 : -1));
      setItems(feed);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="container" style={{ maxWidth: 700 }}>
      <h2>Notifications</h2>
      {loading ? <div className="spinner">Loading…</div> :
        items.length === 0 ? <div className="card center muted">Nothing yet. Apply to jobs or post one to see activity here.</div> :
        items.map((it, i) => (
          <Link to={it.to} key={i}>
            <div className="card row" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="notif-ico"><span className="material-symbols-outlined">{it.icon}</span></div>
              <div className="grow">{it.text}</div>
              <div className="muted tiny">{timeAgo(it.when)}</div>
            </div>
          </Link>
        ))}
    </div>
  );
}
