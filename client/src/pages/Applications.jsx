import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { timeAgo } from "../util.js";

export default function Applications() {
  const [apps, setApps] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/applications/mine")
      .then((r) => setApps(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container" style={{ maxWidth: 760 }}>
      <h2>My applications</h2>
      {error && <div className="card error">{error}</div>}
      {loading ? (
        <div className="spinner">Loading…</div>
      ) : apps.length === 0 ? (
        <div className="card center muted">
          No applications yet. <Link to="/jobs">Browse jobs</Link>
        </div>
      ) : (
        apps.map((a) => (
          <Link to={`/jobs/${a.job_id}`} key={a.id}>
            <div className="card job-card">
              <div className="spread">
                <div>
                  <h3 className="job-title">{a.job_title}</h3>
                  <div style={{ fontWeight: 600 }}>{a.job_company}</div>
                  <div className="muted">{a.job_location || "—"}</div>
                </div>
                <div className="center">
                  <span className={`status-pill status-${a.status}`}>{a.status}</span>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Applied {timeAgo(a.created_at)}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
