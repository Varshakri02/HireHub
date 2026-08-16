// Recruiter dashboard — a recruiter's own postings with the applications they got.
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { timeAgo } from "../util.js";

export default function Recruiter() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.is_recruiter) return;
    api
      .get("/jobs/mine/postings")
      .then((r) => setJobs(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [user]);

  const totals = useMemo(() => {
    return jobs.reduce(
      (t, j) => ({
        applicants: t.applicants + (j.applicant_count || 0),
        pending: t.pending + (j.pending_count || 0),
        accepted: t.accepted + (j.accepted_count || 0),
      }),
      { applicants: 0, pending: 0, accepted: 0 }
    );
  }, [jobs]);

  // Non-recruiters never see this page.
  if (user && !user.is_recruiter) return <Navigate to="/jobs" replace />;

  const tiles = [
    { label: "Job postings", value: jobs.length },
    { label: "Total applicants", value: totals.applicants },
    { label: "Pending review", value: totals.pending },
    { label: "Accepted", value: totals.accepted },
  ];

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <div className="spread" style={{ alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}><span className="material-symbols-outlined head-ico">badge</span> Recruiter Dashboard</h2>
        <Link to="/messages"><button className="secondary small"><span className="material-symbols-outlined ui-ico">chat_bubble</span> Messages</button></Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {tiles.map((t) => (
          <div className="card center" key={t.label} style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{t.value}</div>
            <div className="muted tiny">{t.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: 8 }}>Your postings</h3>
      {error && <div className="card error">{error}</div>}
      {loading ? (
        <div className="spinner">Loading…</div>
      ) : jobs.length === 0 ? (
        <div className="card center muted">No postings yet.</div>
      ) : (
        jobs.map((j) => (
          <div className="card" key={j.id}>
            <div className="spread" style={{ alignItems: "flex-start" }}>
              <div className="grow">
                <Link to={`/jobs/${j.id}`}><strong className="job-title">{j.title}</strong></Link>
                <div>{j.company} · {j.location || "—"}</div>
                <div style={{ marginTop: 6 }}>
                  <span className="chip">{j.type}</span>
                  <span className="chip">{j.workplace}</span>
                  <span className="chip">{j.experience}</span>
                  {j.salary ? <span className="chip">{j.salary}</span> : null}
                </div>
                <div className="muted tiny" style={{ marginTop: 6 }}>Posted {timeAgo(j.created_at)}</div>
              </div>
              <div className="center" style={{ minWidth: 92 }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: "var(--green)" }}>{j.applicant_count}</div>
                <div className="muted tiny">applicants</div>
                <div className="muted tiny" style={{ marginTop: 2 }}>{j.pending_count} pending</div>
                <Link to={`/jobs/${j.id}/manage`}>
                  <button className="small block" style={{ marginTop: 8 }}>Manage</button>
                </Link>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
