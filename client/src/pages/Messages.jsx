import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../socket.js";
import Avatar from "../components/Avatar.jsx";
import { clockTime, dayLabel } from "../util.js";

export default function Messages() {
  const { user } = useAuth();
  const { userId } = useParams();
  const navigate = useNavigate();
  const selectedId = userId ? Number(userId) : null;

  const [convos, setConvos] = useState([]);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const [search, setSearch] = useState("");
  const bottomRef = useRef();
  const typingTimeout = useRef();

  const loadConvos = useCallback(() => {
    api.get("/messages").then((r) => setConvos(r.data)).catch(() => {});
  }, []);
  useEffect(loadConvos, [loadConvos]);

  useEffect(() => {
    if (!selectedId) { setPartner(null); setMessages([]); return; }
    api.get(`/messages/${selectedId}`).then((r) => setMessages(r.data)).catch(() => {});
    const existing = convos.find((c) => c.user_id === selectedId);
    if (existing) setPartner({ id: existing.user_id, name: existing.name, avatar_url: existing.avatar_url, headline: existing.headline });
    else api.get(`/users/${selectedId}`).then((r) => setPartner(r.data)).catch(() => {});
    getSocket()?.emit("message:read", { from: selectedId });
    loadConvos();
  }, [selectedId, convos.length]); // eslint-disable-line

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (msg) => {
      const inThread = selectedId &&
        ((msg.sender_id === selectedId && msg.receiver_id === user.id) ||
         (msg.sender_id === user.id && msg.receiver_id === selectedId));
      if (inThread) {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_id === selectedId) socket.emit("message:read", { from: selectedId });
      }
      loadConvos();
    };
    const onTyping = ({ from }) => {
      if (from === selectedId) {
        setPeerTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setPeerTyping(false), 1500);
      }
    };
    socket.on("message:new", onNew);
    socket.on("typing", onTyping);
    return () => { socket.off("message:new", onNew); socket.off("typing", onTyping); };
  }, [selectedId, user, loadConvos]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, peerTyping]);

  function send(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !selectedId) return;
    getSocket()?.emit("message:send", { to: selectedId, body });
    setDraft("");
  }
  function onDraftChange(e) {
    setDraft(e.target.value);
    if (selectedId) getSocket()?.emit("typing", { to: selectedId });
  }
  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); }
  }

  const shown = convos.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container" style={{ maxWidth: 1128 }}>
      <div className="card flush">
        <div className="chat">
          {/* Conversation list */}
          <div className="chat-list">
            <div className="chat-list-head"><span>Messaging</span><span className="muted"><span className="material-symbols-outlined ui-ico">edit_square</span> <span className="material-symbols-outlined ui-ico">more_horiz</span></span></div>
            <div className="chat-search">
              <div style={{ position: "relative" }}>
                <span className="material-symbols-outlined" style={{ position: "absolute", left: 8, top: 8, fontSize: 18, color: "var(--muted)" }}>search</span>
                <input placeholder="Search messages" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            {shown.length === 0 && (
              <div className="muted tiny" style={{ padding: 14 }}>
                No conversations yet. Open a profile or a job and hit “Message”.
              </div>
            )}
            {shown.map((c) => (
              <div key={c.user_id}
                className={`chat-conv ${c.user_id === selectedId ? "active" : ""}`}
                onClick={() => navigate(`/messages/${c.user_id}`)}>
                <div style={{ position: "relative" }}>
                  <Avatar user={{ name: c.name, avatar_url: c.avatar_url }} size={48} />
                  <span className="online-dot" />
                </div>
                <div className="grow">
                  <div className="spread">
                    <strong>{c.name}</strong>
                    <span className="muted tiny">{clockTime(c.last_at)}</span>
                  </div>
                  <div className="muted tiny" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.last_sender_id === user.id ? "You: " : ""}{c.last_body}
                  </div>
                </div>
                {c.unread > 0 && <span className="badge">{c.unread}</span>}
              </div>
            ))}
          </div>

          {/* Thread */}
          <div className="chat-main">
            {!selectedId ? (
              <div className="spinner" style={{ margin: "auto" }}>
                <span className="material-symbols-outlined empty-ico">forum</span><br />Select a conversation to start messaging.
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <Avatar user={partner} size={40} />
                  <div className="grow">
                    <strong>{partner?.name || "…"}</strong>
                    <div className="muted tiny">{partner?.headline}</div>
                  </div>
                  <div className="icons"><span className="material-symbols-outlined">videocam</span><span className="material-symbols-outlined">call</span><span className="material-symbols-outlined">star</span><span className="material-symbols-outlined">more_horiz</span></div>
                </div>
                <div className="chat-messages">
                  {messages.map((m, i) => {
                    const mine = m.sender_id === user.id;
                    const showDay = i === 0 || dayLabel(m.created_at) !== dayLabel(messages[i - 1].created_at);
                    return (
                      <div key={m.id} style={{ display: "contents" }}>
                        {showDay && <div className="date-pill">{dayLabel(m.created_at)}</div>}
                        <div className={`bubble ${mine ? "mine" : "theirs"}`}>
                          {m.body}
                          <span className="bubble-time">{clockTime(m.created_at)}{mine ? " ✓" : ""}</span>
                        </div>
                      </div>
                    );
                  })}
                  {peerTyping && <div className="bubble theirs muted">typing…</div>}
                  <div ref={bottomRef} />
                </div>
                <form className="chat-input-bar" onSubmit={send}>
                  <textarea placeholder="Write a message…" value={draft} onChange={onDraftChange} onKeyDown={onKey} autoFocus />
                  <div className="chat-tools">
                    <span><span className="material-symbols-outlined ui-ico">image</span></span><span><span className="material-symbols-outlined ui-ico">attach_file</span></span><span><span className="material-symbols-outlined ui-ico">mood</span></span><span className="gif-tag">GIF</span>
                    <button type="submit" className="send" disabled={!draft.trim()}>Send</button>
                  </div>
                  <div className="tiny muted" style={{ textAlign: "right", marginTop: 2 }}>Press Enter to send</div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
