import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { errMsg, uploadFile } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { timeAgo } from "../util.js";

const BLANK_EXP = { title: "", company: "", emp_type: "Full-time", location: "", start_date: "", end_date: "", description: "" };

function Icon({ name }) {
  return <span className="material-symbols-outlined">{name}</span>;
}
// Earliest 4-digit year across experience start dates.
function earliestYear(exps) {
  let min = null;
  for (const e of exps) {
    const m = String(e.start_date || "").match(/(19|20)\d\d/);
    if (m) { const y = +m[0]; if (min === null || y < min) min = y; }
  }
  return min;
}

export default function Profile() {
  const { id } = useParams();
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [exps, setExps] = useState([]);
  const [people, setPeople] = useState([]);
  const [postings, setPostings] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [addExp, setAddExp] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isMe = user && Number(id) === user.id;

  useEffect(() => {
    setEditing(false); setAddExp(false);
    api.get(`/users/${id}`).then((r) => { setProfile(r.data); setForm(r.data); }).catch((e) => setError(errMsg(e)));
    api.get(`/posts/user/${id}`).then((r) => setPosts(r.data)).catch(() => {});
    api.get(`/experiences/user/${id}`).then((r) => setExps(r.data)).catch(() => {});
    api.get(`/users/suggestions/people`).then((r) => setPeople(r.data.filter((p) => p.id !== Number(id)))).catch(() => {});
    api.get(`/jobs/by/${id}`).then((r) => setPostings(r.data)).catch(() => setPostings([]));
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  // Returns an onChange handler that uploads the picked file into form[kind].
  function pickImg(kind) {
    return async (e) => {
      const file = e.target.files?.[0]; if (!file) return;
      setBusy(true);
      try { const info = await uploadFile(file); setForm((f) => ({ ...f, [kind]: info.url })); }
      catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
    };
  }

  async function save(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await api.put("/users/me", {
        name: form.name, headline: form.headline, bio: form.bio,
        location: form.location, avatar_url: form.avatar_url, banner_url: form.banner_url,
        skills: form.skills,
      });
      setProfile(r.data); setUser(r.data); setEditing(false);
    } catch (err) { setError(errMsg(err)); } finally { setBusy(false); }
  }

  if (error && !profile) return <div className="container"><div className="card error">{error}</div></div>;
  if (!profile) return <div className="spinner">Loading…</div>;

  const skillList = (profile.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const ey = earliestYear(exps);
  const yearsExp = ey ? Math.max(1, new Date().getFullYear() - ey) : exps.length;
  const memberYear = String(profile.created_at || "").slice(0, 4);
  const fields = ["avatar_url", "headline", "bio", "location", "skills"];
  const completeness = Math.round(
    ((fields.filter((k) => profile[k]).length + (exps.length ? 1 : 0)) / (fields.length + 1)) * 100
  );

  return (
    <div className="container">
      {/* Hero header */}
      <div className="card flush" style={{ marginBottom: 24 }}>
        {editing ? (
          <ProfileEditForm form={form} set={set} save={save} busy={busy} error={error}
            onCancel={() => { setEditing(false); setForm(profile); }}
            pickAvatar={pickImg("avatar_url")} pickBanner={pickImg("banner_url")} />
        ) : (
          <div className="profile-hero">
            <div className="phero-main">
              <div className="phero-avatar"><Avatar user={profile} size={112} /></div>
              <div className="grow">
                <h1 className="phero-name">{profile.name}</h1>
                <div className="phero-headline">
                  {profile.headline || <span className="muted">No headline yet</span>}
                </div>
                <div className="phero-meta">
                  <Icon name="location_on" />
                  <span>{profile.location || "Earth"}</span>
                  <span>·</span>
                  <span className="open-badge">Open to roles</span>
                </div>
                <div className="phero-actions">
                  {isMe ? (
                    <button onClick={() => setEditing(true)}>Edit Profile</button>
                  ) : (
                    <Link to={`/messages/${profile.id}`}><button><span className="material-symbols-outlined ui-ico">chat_bubble</span> Message</button></Link>
                  )}
                  <button className="secondary">Share</button>
                </div>
              </div>
            </div>

            {/* Stat panel */}
            <div className="pstat">
              <div className="pstat-grid">
                <div>
                  <div className="v">{yearsExp}+ Yrs</div>
                  <div className="k">Experience</div>
                </div>
                <div>
                  <div className="v">{exps.length}</div>
                  <div className="k">Roles</div>
                </div>
              </div>
              <div className="pbar-label"><span>Profile completeness</span><span>{completeness}%</span></div>
              <div className="pbar"><i style={{ width: `${completeness}%` }} /></div>
            </div>
          </div>
        )}
      </div>

      <div className="layout-profile">
        <main>
          {/* About */}
          <div className="card">
            <div className="spread">
              <h3>About Me</h3>
              {isMe && !editing && <button className="x-btn" onClick={() => setEditing(true)}><span className="material-symbols-outlined ui-ico">edit</span></button>}
            </div>
            <p className="post-body" style={{ marginTop: 0 }}>
              {profile.bio || <span className="muted">No summary yet.</span>}
            </p>
          </div>

          {/* Experience (timeline) */}
          <div className="card">
            <div className="spread">
              <h3>Work Experience</h3>
              {isMe && <button className="x-btn" title="Add" onClick={() => setAddExp((v) => !v)}><span className="material-symbols-outlined ui-ico">add</span></button>}
            </div>
            {addExp && (
              <ExpForm onCancel={() => setAddExp(false)} onAdded={(row) => { setExps([row, ...exps]); setAddExp(false); }} />
            )}
            {exps.length === 0 && !addExp ? (
              <div className="muted tiny">No experience added.</div>
            ) : (
              <div className="exp-list">
                {exps.map((x) => (
                  <div className="exp-item timeline" key={x.id}>
                    <div className="spread" style={{ alignItems: "flex-start" }}>
                      <div>
                        <div className="exp-title">{x.title}</div>
                        <div>{x.company} · {x.emp_type}</div>
                        <div className="muted tiny" style={{ marginTop: 2 }}>
                          {[x.start_date, x.end_date].filter(Boolean).join(" – ")}
                          {x.location ? ` · ${x.location}` : ""}
                        </div>
                        {x.description && <p className="post-body tiny" style={{ marginTop: 6 }}>{x.description}</p>}
                      </div>
                      {isMe && (
                        <button className="x-btn" title="Remove"
                          onClick={async () => { await api.delete(`/experiences/${x.id}`); setExps(exps.filter((e) => e.id !== x.id)); }}><span className="material-symbols-outlined ui-ico">delete</span></button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Open roles — postings this user owns, with live applicant counts */}
          {postings.length > 0 && (
            <div className="card">
              <div className="spread">
                <h3>Open Roles</h3>
                <span className="muted tiny">{postings.length} posting{postings.length === 1 ? "" : "s"}</span>
              </div>
              <div className="role-list">
                {postings.map((j) => (
                  <Link to={isMe ? `/jobs/${j.id}/manage` : `/jobs/${j.id}`} className="role-row" key={j.id}>
                    <div className="exp-logo"><Icon name="apartment" /></div>
                    <div className="grow">
                      <div className="exp-title">{j.title}</div>
                      <div className="muted tiny">{j.company} · {j.location || "—"} · {j.workplace}</div>
                    </div>
                    <div className="role-count">
                      <b>{j.applicant_count}</b>
                      <span>applicant{j.applicant_count === 1 ? "" : "s"}</span>
                      {isMe && j.pending_count > 0 && <em>{j.pending_count} pending</em>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          {posts.length > 0 && (
            <div className="card">
              <h3>Activity</h3>
              {posts.map((p) => (
                <div key={p.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 8, marginTop: 8 }}>
                  <div className="muted tiny">{timeAgo(p.created_at)}</div>
                  {p.body && <div className="post-body">{p.body}</div>}
                  {p.doc_url && <a href={p.doc_url} target="_blank" rel="noreferrer"><span className="material-symbols-outlined ui-ico">attach_file</span> {p.doc_name || "Document"}</a>}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right column: Skills + Contact */}
        <aside className="sidebar-right">
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Skills</h3>
            {skillList.length === 0 ? (
              <div className="muted tiny">{isMe ? "Add skills from Edit Profile." : "No skills listed."}</div>
            ) : (
              <div>{skillList.map((s) => <span className="chip" key={s}>{s}</span>)}</div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Contact</h3>
            <div className="contact-row">
              <Icon name="mail" />
              <div><div className="k">Email</div><div className="v">{profile.email || "—"}</div></div>
            </div>
            <div className="contact-row">
              <Icon name="location_on" />
              <div><div className="k">Location</div><div className="v">{profile.location || "—"}</div></div>
            </div>
            <div className="contact-row">
              <Icon name="calendar_month" />
              <div><div className="k">Member since</div><div className="v">{memberYear || "—"}</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ProfileEditForm({ form, set, save, busy, error, onCancel, pickAvatar, pickBanner }) {
  return (
    <div className="card-pad">
      <form onSubmit={save}>
        <div className="profile-banner" style={form.banner_url ? { backgroundImage: `url(${form.banner_url})` } : undefined}>
          <label className="ghost small" style={{ cursor: "pointer", position: "absolute", right: 10, top: 10, background: "var(--card)" }}>
            <span className="material-symbols-outlined ui-ico">photo_camera</span> Banner<input type="file" accept="image/*" onChange={pickBanner} style={{ display: "none" }} />
          </label>
        </div>
        <div style={{ marginTop: -50, marginBottom: 8 }}>
          <Avatar user={form} size={96} />
          <label className="ghost small" style={{ cursor: "pointer", marginLeft: 10 }}>
            <span className="material-symbols-outlined ui-ico">photo_camera</span> Photo<input type="file" accept="image/*" onChange={pickAvatar} style={{ display: "none" }} />
          </label>
        </div>
        <label>Name</label><input value={form.name || ""} onChange={set("name")} required />
        <label>Headline</label><input value={form.headline || ""} onChange={set("headline")} placeholder="e.g. Senior AI Architect @ InnovateTech" />
        <label>Location</label><input value={form.location || ""} onChange={set("location")} />
        <label>Skills (comma separated)</label>
        <input value={form.skills || ""} onChange={set("skills")} placeholder="e.g. Technical Sourcing, Offer Negotiation" />
        <label>About</label><textarea value={form.bio || ""} onChange={set("bio")} />
        {error && <div className="error">{error}</div>}
        <div className="row"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button></div>
      </form>
    </div>
  );
}

function ExpForm({ onCancel, onAdded }) {
  const [f, setF] = useState(BLANK_EXP);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { const r = await api.post("/experiences", f); onAdded(r.data); }
    catch (err) { setError(errMsg(err)); setBusy(false); }
  }
  return (
    <div className="card" style={{ background: "var(--surface-low)" }}>
      <form onSubmit={submit}>
        <label>Title *</label><input value={f.title} onChange={set("title")} required />
        <div className="row">
          <div className="grow"><label>Company *</label><input value={f.company} onChange={set("company")} required /></div>
          <div className="grow"><label>Type</label>
            <select value={f.emp_type} onChange={set("emp_type")}>{["Full-time","Part-time","Contract","Internship"].map((t)=><option key={t}>{t}</option>)}</select>
          </div>
        </div>
        <div className="row">
          <div className="grow"><label>Start</label><input value={f.start_date} onChange={set("start_date")} placeholder="Jan 2021" /></div>
          <div className="grow"><label>End</label><input value={f.end_date} onChange={set("end_date")} placeholder="Present" /></div>
        </div>
        <label>Location</label><input value={f.location} onChange={set("location")} />
        <label>Description</label><textarea value={f.description} onChange={set("description")} />
        {error && <div className="error">{error}</div>}
        <div className="row"><button type="submit" disabled={busy}>{busy ? "Saving…" : "Add"}</button>
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button></div>
      </form>
    </div>
  );
}
