// Applicant management for a job the current user posted.
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import DocAttach from "../components/DocAttach.jsx";
import { timeAgo } from "../util.js";

const STATUSES = ["pending", "reviewing", "accepted", "rejected"];

export default function JobManage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/jobs/${id}`).then((r) => {
      setJob(r.data);
      if (user && r.data.poster_id !== user.id) navigate(`/jobs/${id}`); // not owner
    }).catch((e) => setError(errMsg(e)));
    api.get(`/jobs/${id}/applications`).then((r) => setApplicants(r.data)).catch((e) => setError(errMsg(e)));
  }, [id, user]); // eslint-disable-line

  async function setStatus(appId, status) {
    await api.put(`/applications/${appId}/status`, { status });
    setApplicants((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
  }

  if (error) return <div className="container"><div className="card error">{error}</div></div>;
  if (!job) return <div className="spinner">Loading…</div>;

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <div className="card">
        <div className="spread">
          <div>
            <Link to={`/jobs/${id}`} className="tiny">← Back to listing</Link>
            <h2 style={{ margin: "4px 0 0" }}>{job.title}</h2>
            <div>{job.company} · {job.location || "—"}</div>
          </div>
          <div className="center">
            <div style={{ fontSize: 26, fontWeight: 700 }}>{applicants.length}</div>
            <div className="muted tiny">applicants</div>
          </div>
        </div>
      </div>

      {applicants.length === 0 ? (
        <div className="card center muted">No applications yet.</div>
      ) : (
        applicants.map((a) => (
          <div className="card" key={a.id}>
            <div className="spread">
              <Link to={`/profile/${a.applicant_id}`} className="row">
                <Avatar user={{ name: a.applicant_name, avatar_url: a.applicant_avatar }} />
                <div>
                  <strong>{a.applicant_name}</strong>
                  <div className="muted tiny">{a.applicant_headline}</div>
                  <div className="muted tiny">Applied {timeAgo(a.created_at)}</div>
                </div>
              </Link>
              <span className={`status-pill status-${a.status}`}>{a.status}</span>
            </div>
            {a.cover_letter && <p className="post-body">{a.cover_letter}</p>}
            {a.resume_url && <DocAttach url={a.resume_url} name="Résumé" type="application/pdf" />}
            <div className="row wrap" style={{ marginTop: 10 }}>
              {STATUSES.map((s) => (
                <button key={s} className="ghost small" disabled={a.status === s} onClick={() => setStatus(a.id, s)}>{s}</button>
              ))}
              <Link to={`/messages/${a.applicant_id}`}><button className="small">💬 Message</button></Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
