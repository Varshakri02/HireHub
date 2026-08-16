import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg, uploadFile } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import DocAttach from "../components/DocAttach.jsx";
import { timeAgo } from "../util.js";

const NEWS = [
  { t: "Tech layoffs stabilize in Q3", m: "2d ago · 12,430 readers" },
  { t: "Hybrid work: the final verdict?", m: "1d ago · 45,920 readers" },
  { t: "New AI ethics guidelines proposed", m: "5h ago · 8,102 readers" },
  { t: "VC funding shifts to 'Hard Tech'", m: "2d ago · 3,240 readers" },
];
const RECENT = ["artificialintelligence", "Senior Dev Community", "Cloud Expo 2024"];
const GROUPS = ["Machine Learning Experts", "FinTech Innovators"];

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [body, setBody] = useState("");
  const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [stats, setStats] = useState({ posts: 0, applications: 0 });
  const [liked, setLiked] = useState({});
  const [composing, setComposing] = useState(false);
  const fileRef = useRef();

  function load() {
    api.get("/posts").then((r) => setPosts(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }
  useEffect(load, []);
  useEffect(() => {
    api.get("/users/suggestions/people").then((r) => setPeople(r.data)).catch(() => {});
    if (user) {
      Promise.all([
        api.get(`/posts/user/${user.id}`).then((r) => r.data.length).catch(() => 0),
        api.get("/applications/mine").then((r) => r.data.length).catch(() => 0),
      ]).then(([p, a]) => setStats({ posts: p, applications: a }));
    }
  }, [user]);

  async function attach(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setComposing(true);
    try { setDoc(await uploadFile(file)); }
    catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  }

  async function submit(e) {
    e.preventDefault();
    if (!body.trim() && !doc) return;
    setBusy(true); setError("");
    try {
      const r = await api.post("/posts", { body, doc_url: doc?.url, doc_name: doc?.name, doc_type: doc?.type });
      setPosts([r.data, ...posts]);
      setBody(""); setDoc(null); setComposing(false);
      if (fileRef.current) fileRef.current.value = "";
      setStats((s) => ({ ...s, posts: s.posts + 1 }));
    } catch (err) { setError(errMsg(err)); }
    finally { setBusy(false); }
  }

  async function del(id) {
    if (!confirm("Delete this post?")) return;
    await api.delete(`/posts/${id}`);
    setPosts(posts.filter((p) => p.id !== id));
  }

  return (
    <div className="container layout-feed">
      {/* Left column */}
      <aside className="col-left">
        <div className="card flush mini-card">
          <div className="banner" />
          <div className="mini-body">
            <Avatar user={user} size={56} />
            <h4 style={{ margin: "6px 0 2px" }}>
              <Link to={`/profile/${user?.id}`}>{user?.name}</Link>
            </h4>
            <div className="muted tiny">{user?.headline || "Add a headline"}</div>
          </div>
          <div className="divider" style={{ margin: 0 }} />
          <div style={{ padding: "8px 12px" }}>
            <div className="mini-stat"><span className="muted">Your posts</span><b>{stats.posts}</b></div>
            <div className="mini-stat"><span className="muted">Applications</span><b>{stats.applications}</b></div>
          </div>
        </div>
        <div className="card">
          <div className="filter-h tiny muted" style={{ textTransform: "uppercase", letterSpacing: 0.4 }}>Recent</div>
          <div className="side-list">
            {RECENT.map((r) => <a key={r}># {r}</a>)}
          </div>
          <div className="filter-h tiny muted" style={{ textTransform: "uppercase", letterSpacing: 0.4, marginTop: 8 }}>Groups</div>
          <div className="side-list">
            {GROUPS.map((g) => <a key={g}><span className="material-symbols-outlined ui-ico">groups</span> {g}</a>)}
          </div>
        </div>
      </aside>

      {/* Center column */}
      <main>
        <div className="card">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <Avatar user={user} size={44} />
            <textarea
              placeholder="Start a post"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={() => setComposing(true)}
              style={{ margin: 0, minHeight: composing ? 90 : 44 }}
            />
          </div>
          {doc && (
            <div style={{ marginTop: 8 }}>
              <DocAttach {...doc} />
              <button type="button" className="danger small" onClick={() => setDoc(null)} style={{ marginTop: 6 }}>
                Remove attachment
              </button>
            </div>
          )}
          {error && <div className="error">{error}</div>}
          <div className="composer-actions">
            <label className="act" style={{ cursor: "pointer" }}>
              <span className="material-symbols-outlined ui-ico">image</span> Photo
              <input ref={fileRef} type="file" onChange={attach} style={{ display: "none" }} accept="image/*" />
            </label>
            <label className="act" style={{ cursor: "pointer" }}>
              <span className="material-symbols-outlined ui-ico">description</span> Document
              <input type="file" onChange={attach} style={{ display: "none" }} accept=".pdf,.doc,.docx,.txt" />
            </label>
            <button type="button" className="act" onClick={() => setComposing(true)}><span className="material-symbols-outlined ui-ico">event</span> Event</button>
            <button className="small" disabled={busy || (!body.trim() && !doc)} onClick={submit}>
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="spinner">Loading feed…</div>
        ) : posts.length === 0 ? (
          <div className="card center muted">No posts yet. Be the first!</div>
        ) : (
          posts.map((p) => (
            <div className="card" key={p.id}>
              <div className="post-head">
                <Link to={`/profile/${p.author_id}`}>
                  <Avatar user={{ name: p.author_name, avatar_url: p.author_avatar }} size={44} />
                </Link>
                <div className="grow">
                  <Link to={`/profile/${p.author_id}`}><strong>{p.author_name}</strong></Link>
                  <div className="muted tiny">{p.author_headline}</div>
                  <div className="muted tiny">{timeAgo(p.created_at)} · <span className="material-symbols-outlined ui-ico tiny-ico">public</span></div>
                </div>
                {p.author_id === user?.id && (
                  <button className="x-btn" title="Delete" onClick={() => del(p.id)}><span className="material-symbols-outlined ui-ico">delete</span></button>
                )}
              </div>
              {p.body && <div className="post-body">{p.body}</div>}
              {p.doc_type?.startsWith("image/") ? (
                <a href={p.doc_url} target="_blank" rel="noreferrer">
                  <img className="post-img" src={p.doc_url} alt={p.doc_name} />
                </a>
              ) : (
                <DocAttach url={p.doc_url} name={p.doc_name} type={p.doc_type} />
              )}
              <div className="post-counts">
                <span><span className="material-symbols-outlined react-ico fill">favorite</span> {liked[p.id] ? "You and others" : "842 others"}</span>
                <span>42 comments · 12 reposts</span>
              </div>
              <div className="post-actions">
                <button className={`act ${liked[p.id] ? "liked" : ""}`} onClick={() => setLiked((l) => ({ ...l, [p.id]: !l[p.id] }))}><span className="material-symbols-outlined ui-ico">thumb_up</span> Like</button>
                <button className="act"><span className="material-symbols-outlined ui-ico">mode_comment</span> Comment</button>
                <button className="act"><span className="material-symbols-outlined ui-ico">repeat</span> Repost</button>
                <Link to={`/messages/${p.author_id}`} className="act" style={{ textDecoration: "none" }}><span className="material-symbols-outlined ui-ico">send</span> Send</Link>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Right column */}
      <aside className="col-right">
        <div className="card sticky">
          <strong>HireHub News</strong>
          {NEWS.map((n) => (
            <div className="news-item" key={n.t}>
              <b>{n.t}</b>
              <div className="muted tiny">{n.m}</div>
            </div>
          ))}
        </div>
        <div className="card">
          <strong>Add to your feed</strong>
          {people.length === 0 && <div className="muted tiny" style={{ marginTop: 8 }}>Invite colleagues to see suggestions.</div>}
          {people.map((p) => (
            <div className="people-item" key={p.id}>
              <Link to={`/profile/${p.id}`}><Avatar user={p} size={44} /></Link>
              <div className="grow">
                <Link to={`/profile/${p.id}`}><strong>{p.name}</strong></Link>
                <div className="muted tiny">{p.headline}</div>
                <Link to={`/messages/${p.id}`}>
                  <button className="ghost small" style={{ marginTop: 6 }}><span className="material-symbols-outlined ui-ico">chat_bubble</span> Message</button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
