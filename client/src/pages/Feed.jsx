import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg, uploadFile } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import DocAttach from "../components/DocAttach.jsx";
import Comments from "../components/Comments.jsx";
import ConnectButton from "../components/ConnectButton.jsx";
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
  const [openComments, setOpenComments] = useState({});
  const [composing, setComposing] = useState(false);
  const fileRef = useRef();

  function load() {
    api.get("/posts").then((r) => setPosts(r.data)).catch((e) => setError(errMsg(e))).finally(() => setLoading(false));
  }
  useEffect(load, []);
  useEffect(() => {
    api.get("/connections/suggestions", { params: { limit: 4 } })
      .then((r) => setPeople(r.data))
      .catch(() => {});
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

  // Replace one post in the list with the server's fresh copy (counts + my like).
  function patchPost(next) {
    setPosts((cur) => cur.map((p) => (p.id === next.id ? next : p)));
  }

  // Optimistic toggle: flip locally, then reconcile with the server's counts.
  async function toggleLike(post) {
    const optimistic = {
      ...post,
      liked_by_me: post.liked_by_me ? 0 : 1,
      like_count: post.like_count + (post.liked_by_me ? -1 : 1),
    };
    patchPost(optimistic);
    try {
      const r = post.liked_by_me
        ? await api.delete(`/posts/${post.id}/like`)
        : await api.post(`/posts/${post.id}/like`);
      patchPost(r.data);
    } catch (e) {
      patchPost(post); // roll back
      setError(errMsg(e));
    }
  }

  function bumpComments(id, delta) {
    setPosts((cur) =>
      cur.map((p) => (p.id === id ? { ...p, comment_count: Math.max(0, p.comment_count + delta) } : p))
    );
  }

  // "You and 3 others" / "12 people" — reads naturally at every count.
  function likeLabel(p) {
    const others = p.like_count - (p.liked_by_me ? 1 : 0);
    if (p.liked_by_me) return others === 0 ? "You" : `You and ${others} other${others === 1 ? "" : "s"}`;
    return `${p.like_count} ${p.like_count === 1 ? "person" : "people"}`;
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
              {(p.like_count > 0 || p.comment_count > 0) && (
                <div className="post-counts">
                  <span>
                    {p.like_count > 0 && (
                      <>
                        <span className="material-symbols-outlined react-ico fill">favorite</span> {likeLabel(p)}
                      </>
                    )}
                  </span>
                  {p.comment_count > 0 && (
                    <button className="link-btn" onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}>
                      {p.comment_count} comment{p.comment_count === 1 ? "" : "s"}
                    </button>
                  )}
                </div>
              )}
              <div className="post-actions">
                <button className={`act ${p.liked_by_me ? "liked" : ""}`} onClick={() => toggleLike(p)}>
                  <span className="material-symbols-outlined ui-ico">thumb_up</span> {p.liked_by_me ? "Liked" : "Like"}
                </button>
                <button
                  className={`act ${openComments[p.id] ? "liked" : ""}`}
                  onClick={() => setOpenComments((o) => ({ ...o, [p.id]: !o[p.id] }))}
                >
                  <span className="material-symbols-outlined ui-ico">mode_comment</span> Comment
                </button>
                <Link to={`/messages/${p.author_id}`} className="act" style={{ textDecoration: "none" }}><span className="material-symbols-outlined ui-ico">send</span> Send</Link>
              </div>
              {openComments[p.id] && (
                <Comments
                  postId={p.id}
                  postAuthorId={p.author_id}
                  onCountChange={(d) => bumpComments(p.id, d)}
                />
              )}
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
          <div className="spread">
            <strong>People you may know</strong>
            <Link to="/network" className="tiny">See all</Link>
          </div>
          {people.length === 0 && <div className="muted tiny" style={{ marginTop: 8 }}>No suggestions right now.</div>}
          {people.map((p) => (
            <div className="people-item" key={p.id}>
              <Link to={`/profile/${p.id}`}><Avatar user={p} size={44} /></Link>
              <div className="grow">
                <Link to={`/profile/${p.id}`}><strong>{p.name}</strong></Link>
                <div className="muted tiny">{p.headline}</div>
                <div style={{ marginTop: 6 }}>
                  <ConnectButton
                    userId={p.id}
                    initial={{ state: "none", connection_id: null }}
                    onChange={(rel) => {
                      // Once connected/invited they no longer belong in suggestions.
                      if (rel.state !== "none") setPeople((cur) => cur.filter((x) => x.id !== p.id));
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
