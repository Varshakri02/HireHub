// Comment thread for one post. Loads lazily the first time it's opened so the
// feed stays one request.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "./Avatar.jsx";
import { timeAgo } from "../util.js";

export default function Comments({ postId, postAuthorId, onCountChange }) {
  const { user } = useAuth();
  const [items, setItems] = useState(null); // null = not loaded yet
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get(`/posts/${postId}/comments`)
      .then((r) => alive && setItems(r.data))
      .catch((e) => alive && (setError(errMsg(e)), setItems([])));
    return () => { alive = false; };
  }, [postId]);

  async function submit(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setBusy(true); setError("");
    try {
      const r = await api.post(`/posts/${postId}/comments`, { body: text });
      setItems((cur) => [...(cur || []), r.data]);
      setBody("");
      onCountChange?.(+1);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function del(id) {
    try {
      await api.delete(`/posts/comments/${id}`);
      setItems((cur) => cur.filter((c) => c.id !== id));
      onCountChange?.(-1);
    } catch (err) {
      setError(errMsg(err));
    }
  }

  return (
    <div className="comments">
      <form className="comment-new" onSubmit={submit}>
        <Avatar user={user} size={32} />
        <input
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ margin: 0 }}
        />
        <button className="small" disabled={busy || !body.trim()}>
          {busy ? "…" : "Post"}
        </button>
      </form>
      {error && <div className="error tiny">{error}</div>}
      {items === null ? (
        <div className="muted tiny" style={{ padding: "8px 0" }}>Loading comments…</div>
      ) : items.length === 0 ? (
        <div className="muted tiny" style={{ padding: "8px 0" }}>No comments yet.</div>
      ) : (
        items.map((c) => (
          <div className="comment" key={c.id}>
            <Link to={`/profile/${c.author_id}`}>
              <Avatar user={{ name: c.author_name, avatar_url: c.author_avatar }} size={32} />
            </Link>
            <div className="grow">
              <div className="comment-bubble">
                <div className="spread">
                  <Link to={`/profile/${c.author_id}`}><strong>{c.author_name}</strong></Link>
                  <span className="muted tiny">{timeAgo(c.created_at)}</span>
                </div>
                {c.author_headline && <div className="muted tiny">{c.author_headline}</div>}
                <div className="comment-body">{c.body}</div>
              </div>
            </div>
            {/* Own comment, or any comment on your own post (moderation). */}
            {(c.author_id === user?.id || postAuthorId === user?.id) && (
              <button className="x-btn" title="Delete" onClick={() => del(c.id)}>
                <span className="material-symbols-outlined ui-ico">delete</span>
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
}
