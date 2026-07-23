// Admin oversight panel — view every user-to-user conversation on the platform.
import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import { clockTime, dayLabel } from "../util.js";

const pairKey = (a, b) => `${a}-${b}`;

export default function Admin() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null); // { a, b, aName, bName }
  const [thread, setThread] = useState([]);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState(null); // flat search results, or null when idle

  const loadConvos = useCallback(() => {
    api.get("/admin/conversations").then((r) => setConvos(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user?.is_admin) return;
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    loadConvos();
  }, [user, loadConvos]);

  useEffect(() => {
    if (!selected) { setThread([]); return; }
    api
      .get(`/admin/conversations/${selected.a}/${selected.b}`)
      .then((r) => setThread(r.data))
      .catch(() => {});
  }, [selected]);

  function runSearch(e) {
    e.preventDefault();
    const q = search.trim();
    if (!q) { setHits(null); return; }
    api.get("/admin/messages", { params: { q } }).then((r) => setHits(r.data)).catch(() => {});
  }
  function clearSearch() { setSearch(""); setHits(null); }

  // Non-admins never see this page.
  if (user && !user.is_admin) return <Navigate to="/" replace />;

  const tiles = [
    { label: "Messages", value: stats?.totalMessages },
    { label: "Conversations", value: stats?.conversations },
    { label: "Active senders", value: stats?.activeSenders },
    { label: "Users", value: stats?.totalUsers },
  ];

  return (
    <div className="container" style={{ maxWidth: 1128 }}>
      <div className="spread" style={{ alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>🛡️ Admin — Message Oversight</h2>
        <span className="muted tiny">Read-only. Viewing does not mark anything read.</span>
      </div>

      {/* Stat tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
        {tiles.map((t) => (
          <div className="card center" key={t.label} style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 700 }}>{t.value ?? "—"}</div>
            <div className="muted tiny">{t.label}</div>
          </div>
        ))}
      </div>

      {/* Global message search */}
      <div className="card">
        <form className="row" onSubmit={runSearch}>
          <input
            placeholder="Search all messages by text or participant name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ margin: 0 }}
          />
          <button type="submit">Search</button>
          {hits !== null && (
            <button type="button" className="secondary" onClick={clearSearch}>Clear</button>
          )}
        </form>
      </div>

      {hits !== null ? (
        /* ---- Flat search results ---- */
        <div className="card">
          <div className="muted tiny" style={{ marginBottom: 8 }}>
            {hits.length} match{hits.length === 1 ? "" : "es"}
          </div>
          {hits.length === 0 ? (
            <div className="center muted">No messages found.</div>
          ) : (
            hits.map((m) => (
              <div key={m.id} className="row" style={{ alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid var(--line, #eee)" }}>
                <Avatar user={{ name: m.sender_name, avatar_url: m.sender_avatar }} size={36} />
                <div className="grow">
                  <div className="tiny">
                    <strong>{m.sender_name}</strong>
                    <span className="muted"> → {m.receiver_name} · {dayLabel(m.created_at)} {clockTime(m.created_at)}</span>
                  </div>
                  <div>{m.body}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ---- Conversation browser ---- */
        <div className="card flush">
          <div className="chat">
            <div className="chat-list">
              <div className="chat-list-head">
                <span>All conversations</span>
                <span className="muted tiny">{convos.length}</span>
              </div>
              {convos.length === 0 && (
                <div className="muted tiny" style={{ padding: 14 }}>No messages on the platform yet.</div>
              )}
              {convos.map((c) => {
                const k = pairKey(c.user_a_id, c.user_b_id);
                const active = selected && pairKey(selected.a, selected.b) === k;
                return (
                  <div
                    key={k}
                    className={`chat-conv ${active ? "active" : ""}`}
                    onClick={() => setSelected({ a: c.user_a_id, b: c.user_b_id, aName: c.user_a_name, bName: c.user_b_name })}
                  >
                    <Avatar user={{ name: c.user_a_name, avatar_url: c.user_a_avatar }} size={40} />
                    <div className="grow">
                      <div className="spread">
                        <strong style={{ fontSize: 13 }}>{c.user_a_name} ↔ {c.user_b_name}</strong>
                        <span className="muted tiny">{clockTime(c.last_at)}</span>
                      </div>
                      <div className="muted tiny" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.last_sender_id === c.user_a_id ? c.user_a_name : c.user_b_name}: {c.last_body}
                      </div>
                    </div>
                    <span className="badge">{c.total}</span>
                  </div>
                );
              })}
            </div>

            <div className="chat-main">
              {!selected ? (
                <div className="spinner" style={{ margin: "auto" }}>
                  🛡️<br />Select a conversation to inspect it.
                </div>
              ) : (
                <>
                  <div className="chat-header">
                    <div className="grow">
                      <strong>{selected.aName} ↔ {selected.bName}</strong>
                      <div className="muted tiny">{thread.length} message{thread.length === 1 ? "" : "s"}</div>
                    </div>
                  </div>
                  <div className="chat-messages">
                    {thread.map((m, i) => {
                      const rightSide = m.sender_id === selected.b;
                      const showDay = i === 0 || dayLabel(m.created_at) !== dayLabel(thread[i - 1].created_at);
                      return (
                        <div key={m.id} style={{ display: "contents" }}>
                          {showDay && <div className="date-pill">{dayLabel(m.created_at)}</div>}
                          <div className={`bubble ${rightSide ? "mine" : "theirs"}`}>
                            <div className="tiny" style={{ fontWeight: 700, opacity: 0.7, marginBottom: 2 }}>
                              {m.sender_name}
                            </div>
                            {m.body}
                            <span className="bubble-time">{clockTime(m.created_at)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
