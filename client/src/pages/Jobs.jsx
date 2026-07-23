import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import api, { errMsg, uploadFile } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import DocAttach from "../components/DocAttach.jsx";
import { timeAgo } from "../util.js";

const EXPERIENCE = ["Internship", "Entry level", "Associate", "Mid-Senior level"];
const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const WORKPLACES = ["Remote", "On-site", "Hybrid"];
const DATE_OPTS = [
  { k: "any", label: "Any time", days: Infinity },
  { k: "month", label: "Past month", days: 30 },
  { k: "week", label: "Past week", days: 7 },
  { k: "day", label: "Past 24 hours", days: 1 },
];
const BLANK_JOB = {
  title: "", company: "", location: "", type: "Full-time", workplace: "Remote",
  experience: "Mid-Senior level", salary: "", skills: "", responsibilities: "", description: "",
};

// Parse a leading dollar amount like "$120k" -> 120000.
function salaryMin(s = "") {
  const m = s.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*k?/i);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (/k/i.test(m[0])) n *= 1000;
  return n;
}
function daysSince(iso) {
  return (Date.now() - new Date(iso.replace(" ", "T") + "Z").getTime()) / 86400000;
}

export default function Jobs() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // search + filters
  const [q, setQ] = useState(sp.get("q") || "");
  const [loc, setLoc] = useState("");
  const [expF, setExpF] = useState(new Set());
  const [typeF, setTypeF] = useState(new Set());
  const [workF, setWorkF] = useState(new Set());
  const [company, setCompany] = useState("");
  const [dateK, setDateK] = useState("any");
  const [minSalary, setMinSalary] = useState(0);

  const [showForm, setShowForm] = useState(false);

  function load(query = q, location = loc) {
    setLoading(true);
    api.get("/jobs", { params: { q: query, location } })
      .then((r) => setJobs(r.data))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  // Load the detail for the selected (or first) job.
  const selId = id ? Number(id) : selected;
  useEffect(() => {
    const target = selId || jobs[0]?.id;
    if (!target) { setSelected(null); return; }
    api.get(`/jobs/${target}`).then((r) => setSelected(r.data)).catch(() => {});
  }, [selId, jobs]);

  const toggle = (set, val) => (setter) =>
    setter((prev) => { const n = new Set(prev); n.has(val) ? n.delete(val) : n.add(val); return n; });

  const filtered = useMemo(() => {
    const days = DATE_OPTS.find((d) => d.k === dateK)?.days ?? Infinity;
    return jobs.filter((j) => {
      if (expF.size && !expF.has(j.experience)) return false;
      if (typeF.size && !typeF.has(j.type)) return false;
      if (workF.size && !workF.has(j.workplace)) return false;
      if (company && !(j.company || "").toLowerCase().includes(company.toLowerCase())) return false;
      if (days !== Infinity && daysSince(j.created_at) > days) return false;
      if (minSalary > 0) { const m = salaryMin(j.salary); if (m !== null && m < minSalary) return false; }
      return true;
    });
  }, [jobs, expF, typeF, workF, company, dateK, minSalary]);

  return (
    <div className="container">
      {/* Search row */}
      <div className="card">
        <form className="job-search-row" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <div className="field"><span className="ico material-symbols-outlined">search</span>
            <input placeholder="Job title, keywords, or company" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="field"><span className="ico material-symbols-outlined">location_on</span>
            <input placeholder="Location" value={loc} onChange={(e) => setLoc(e.target.value)} />
          </div>
          <button type="submit">Search</button>
        </form>
      </div>

      <div className="layout-jobs">
        {/* Filters */}
        <aside>
          <div className="card">
            <button className="block" onClick={() => setShowForm(true)}>+ Post a job</button>
          </div>
          <div className="card sticky">
            <h3 style={{ marginBottom: 2 }}>Filters</h3>

            <div className="filter-h">Date posted</div>
            <select value={dateK} onChange={(e) => setDateK(e.target.value)} style={{ margin: "4px 0 8px" }}>
              {DATE_OPTS.map((d) => <option key={d.k} value={d.k}>{d.label}</option>)}
            </select>

            <div className="filter-h">Experience level</div>
            {EXPERIENCE.map((x) => (
              <label className="check" key={x}>
                <input type="checkbox" checked={expF.has(x)} onChange={() => toggle(expF, x)(setExpF)} /> {x}
              </label>
            ))}

            <div className="filter-h">Company</div>
            <input placeholder="Search companies" value={company} onChange={(e) => setCompany(e.target.value)} />

            <div className="filter-h">Job type</div>
            {JOB_TYPES.map((x) => (
              <label className="check" key={x}>
                <input type="checkbox" checked={typeF.has(x)} onChange={() => toggle(typeF, x)(setTypeF)} /> {x}
              </label>
            ))}

            <div className="filter-h">Workplace</div>
            {WORKPLACES.map((x) => (
              <label className="check" key={x}>
                <input type="checkbox" checked={workF.has(x)} onChange={() => toggle(workF, x)(setWorkF)} /> {x}
              </label>
            ))}

            <div className="filter-h">Minimum salary</div>
            <input type="range" min="0" max="200000" step="10000" value={minSalary}
              onChange={(e) => setMinSalary(Number(e.target.value))} style={{ margin: 0 }} />
            <div className="spread tiny muted"><span>$0</span><span>${(minSalary/1000).toFixed(0)}k+</span></div>
          </div>
        </aside>

        {/* Results + detail */}
        <div className="card flush">
          <div className="job-split">
            <div className="job-list">
              <div className="spread" style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                <strong>{filtered.length} Results</strong>
                <span className="muted tiny">Most relevant</span>
              </div>
              {loading ? (
                <div className="spinner">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="center muted" style={{ padding: 24 }}>No jobs match your filters.</div>
              ) : (
                filtered.map((j) => (
                  <div key={j.id}
                    className={`job-li ${(selected?.id === j.id) ? "active" : ""}`}
                    onClick={() => navigate(`/jobs/${j.id}`)}>
                    <div className="job-logo">🏢</div>
                    <div className="grow">
                      <div className="job-title">{j.title}</div>
                      <div>{j.company}</div>
                      <div className="muted tiny">{j.location || "—"} {j.workplace ? `(${j.workplace})` : ""}</div>
                      <div className="tiny muted" style={{ marginTop: 4 }}>
                        {j.is_saved ? "★ Saved · " : ""}{j.applicant_count} applicants · {timeAgo(j.created_at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="job-detail-pane">
              {selected ? (
                <JobDetailPane job={selected} me={user}
                  onChange={(patch) => setSelected((s) => ({ ...s, ...patch }))}
                  onSavedChange={(saved) => setJobs((js) => js.map((x) => x.id === selected.id ? { ...x, is_saved: saved ? 1 : 0 } : x))}
                  onDeleted={() => { setJobs((js) => js.filter((x) => x.id !== selected.id)); navigate("/jobs"); }}
                />
              ) : (
                <div className="center muted" style={{ padding: 40 }}>Select a job to see details.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showForm && <PostJobModal onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

// ---- Detail pane ----
function JobDetailPane({ job, me, onChange, onSavedChange, onDeleted }) {
  const isOwner = me && job.poster_id === me.id;
  const [applying, setApplying] = useState(false);
  const [cover, setCover] = useState("");
  const [resume, setResume] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const skills = (job.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const resp = (job.responsibilities || "").split("\n").map((s) => s.trim()).filter(Boolean);

  async function toggleSave() {
    const next = !job.is_saved;
    if (next) await api.post(`/jobs/${job.id}/save`); else await api.delete(`/jobs/${job.id}/save`);
    onChange({ is_saved: next ? 1 : 0 }); onSavedChange(next);
  }
  async function pickResume(e) {
    const f = e.target.files?.[0]; if (!f) return;
    setBusy(true); try { setResume(await uploadFile(f)); } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }
  async function submitApply(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      await api.post("/applications", { job_id: job.id, cover_letter: cover, resume_url: resume?.url });
      onChange({ my_application: { status: "pending" } }); setApplying(false);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }
  async function del() {
    if (!confirm("Delete this job posting?")) return;
    await api.delete(`/jobs/${job.id}`); onDeleted();
  }

  return (
    <div>
      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="job-logo" style={{ width: 56, height: 56, fontSize: 26 }}>🏢</div>
        <div className="grow">
          <h2 style={{ margin: 0 }}>{job.title}</h2>
          <div>{job.company} · {job.location || "—"} · {timeAgo(job.created_at)}</div>
          <div style={{ color: "var(--green)", fontWeight: 600, marginTop: 2 }}>{job.applicant_count} applicants</div>
        </div>
      </div>

      <div className="row" style={{ margin: "14px 0" }}>
        {isOwner ? (
          <>
            <Link to={`/jobs/${job.id}/manage`}><button>Manage applicants</button></Link>
            <button className="danger" onClick={del}>Delete</button>
          </>
        ) : job.my_application ? (
          <span className="row">
            <span className={`status-pill status-${job.my_application.status}`}>Applied · {job.my_application.status}</span>
          </span>
        ) : (
          <button onClick={() => setApplying((a) => !a)}>Apply ↗</button>
        )}
        {!isOwner && (
          <button className="secondary" onClick={toggleSave}>{job.is_saved ? "★ Saved" : "Save"}</button>
        )}
        <Link to={`/messages/${job.poster_id}`}>
          <button className="ghost">💬 Message recruiter</button>
        </Link>
      </div>

      {applying && !isOwner && !job.my_application && (
        <div className="card" style={{ background: "#f8fafd" }}>
          <form onSubmit={submitApply}>
            <label>Cover letter</label>
            <textarea value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Why are you a great fit?" />
            <label className="secondary small" style={{ cursor: "pointer", display: "inline-block" }}>
              📎 {resume ? "Change résumé" : "Attach résumé"}
              <input type="file" onChange={pickResume} style={{ display: "none" }} accept=".pdf,.doc,.docx,.txt" />
            </label>
            {resume && <div style={{ marginTop: 8 }}><DocAttach {...resume} /></div>}
            {error && <div className="error">{error}</div>}
            <div style={{ marginTop: 10 }}>
              <button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit application"}</button>
            </div>
          </form>
        </div>
      )}

      <h4>About the job</h4>
      <p className="post-body" style={{ marginTop: 0 }}>{job.description || "No description provided."}</p>

      {resp.length > 0 && (
        <>
          <h4>Key Responsibilities</h4>
          <ul style={{ marginTop: 0, paddingLeft: 18, lineHeight: 1.7 }}>
            {resp.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </>
      )}

      {skills.length > 0 && (
        <>
          <h4>Skills</h4>
          <div>{skills.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
        </>
      )}

      <div className="divider" />
      <div className="row muted tiny">
        Posted by
        <Link to={`/profile/${job.poster_id}`} className="row" style={{ gap: 6 }}>
          <Avatar user={{ name: job.poster_name, avatar_url: job.poster_avatar }} size={22} />
          {job.poster_name}{job.poster_headline ? ` · ${job.poster_headline}` : ""}
        </Link>
      </div>
    </div>
  );
}

// ---- Post job modal ----
function PostJobModal({ onClose, onCreated }) {
  const [form, setForm] = useState(BLANK_JOB);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.post("/jobs", form); onCreated(); }
    catch (err) { setError(errMsg(err)); setBusy(false); }
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Post a job</h3><button className="x-btn" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <label>Title *</label><input value={form.title} onChange={set("title")} required />
            <div className="row">
              <div className="grow"><label>Company *</label><input value={form.company} onChange={set("company")} required /></div>
              <div className="grow"><label>Location</label><input value={form.location} onChange={set("location")} /></div>
            </div>
            <div className="row">
              <div className="grow"><label>Type</label>
                <select value={form.type} onChange={set("type")}>{JOB_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="grow"><label>Workplace</label>
                <select value={form.workplace} onChange={set("workplace")}>{WORKPLACES.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
            </div>
            <div className="row">
              <div className="grow"><label>Experience</label>
                <select value={form.experience} onChange={set("experience")}>{EXPERIENCE.map((t) => <option key={t}>{t}</option>)}</select>
              </div>
              <div className="grow"><label>Salary</label><input value={form.salary} onChange={set("salary")} placeholder="e.g. $120k" /></div>
            </div>
            <label>Skills (comma separated)</label>
            <input value={form.skills} onChange={set("skills")} placeholder="Figma, Prototyping, UX Research" />
            <label>Key responsibilities (one per line)</label>
            <textarea value={form.responsibilities} onChange={set("responsibilities")} placeholder={"Own end-to-end design\nCollaborate with PMs"} />
            <label>Description</label>
            <textarea value={form.description} onChange={set("description")} />
            {error && <div className="error">{error}</div>}
            <button type="submit" disabled={busy}>{busy ? "Posting…" : "Publish job"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
