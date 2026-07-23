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
      api.get("/jobs").then((r) => r.data).catch(() => []),
    ]).then(([apps, jobs]) => {
      const feed = [];
      for (const a of apps) {
        feed.push({
          when: a.created_at,
          icon: a.status === "accepted" ? "🎉" : a.status === "rejected" ? "❌" : "📋",
          text: <>Your application to <b>{a.job_title}</b> at {a.job_company} is <span className={`status-pill status-${a.status}`}>{a.status}</span></>,
          to: `/jobs/${a.job_id}`,
        });
      }
      for (const j of jobs.filter((x) => x.poster_id === user?.id && x.applicant_count > 0)) {
        feed.push({
          when: j.created_at,
          icon: "👤",
          text: <><b>{j.applicant_count}</b> applicant{j.applicant_count === 1 ? "" : "s"} on your posting <b>{j.title}</b></>,
          to: `/jobs/${j.id}/manage`,
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
              <div style={{ fontSize: 22 }}>{it.icon}</div>
              <div className="grow">{it.text}</div>
              <div className="muted tiny">{timeAgo(it.when)}</div>
            </div>
          </Link>
        ))}
    </div>
  );
}
