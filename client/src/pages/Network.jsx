// My Network — real connection graph: invitations to answer, accepted
// connections, invitations I sent, and people to discover.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getSocket } from "../socket.js";
import Avatar from "../components/Avatar.jsx";
import ConnectButton from "../components/ConnectButton.jsx";
import { timeAgo } from "../util.js";

// timeAgo returns either "just now" or a span like "3d"; only the span wants "ago".
const since = (iso) => {
  const t = timeAgo(iso);
  return t === "just now" ? t : t + " ago";
};

const TABS = [
  { key: "invitations", label: "Invitations", ico: "mark_email_unread" },
  { key: "connections", label: "Connections", ico: "group" },
  { key: "sent", label: "Sent", ico: "outgoing_mail" },
  { key: "discover", label: "Discover", ico: "travel_explore" },
];

// One person card. The action slot differs per tab.
function PersonCard({ p, meta, children }) {
  return (
    <div className="card center person-card">
      <Link to={`/profile/${p.id}`}><Avatar user={p} size={64} /></Link>
      <h4 style={{ margin: "8px 0 2px" }}>
        <Link to={`/profile/${p.id}`}>{p.name}</Link>
      </h4>
      <div className="muted tiny" style={{ minHeight: 32 }}>{p.headline}</div>
      <div className="muted tiny">{p.location}</div>
      {meta && <div className="muted tiny person-meta">{meta}</div>}
      <div className="person-actions">{children}</div>
    </div>
  );
}

export default function Network() {
  const { user } = useAuth();
  const [tab, setTab] = useState("connections");
  const [pending, setPending] = useState([]);
  const [connections, setConnections] = useState([]);
  const [sent, setSent] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Everything but Discover is cheap and drives the tab counts, so load it together.
  const loadGraph = useCallback(() => {
    return Promise.all([
      api.get("/connections/pending").then((r) => r.data).catch(() => []),
      api.get("/connections").then((r) => r.data).catch(() => []),
      api.get("/connections/sent").then((r) => r.data).catch(() => []),
    ]).then(([p, c, s]) => {
      setPending(p);
      setConnections(c);
      setSent(s);
      // Land on Invitations when something is actually waiting.
      if (p.length > 0) setTab((t) => (t === "connections" ? "invitations" : t));
    });
  }, []);

  const loadDiscover = useCallback((query = "") => {
    // With a search term, look across all members and drop anyone already in the
    // graph; without one, let the server pick suggestions.
    const req = query
      ? api.get("/users", { params: { q: query } })
      : api.get("/connections/suggestions", { params: { limit: 12 } });
    return req
      .then((r) => setDiscover(r.data.filter((p) => p.id !== user?.id)))
      .catch((e) => setError(errMsg(e)));
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadGraph(), loadDiscover()]).finally(() => setLoading(false));
  }, [loadGraph, loadDiscover]);

  // Invitations and acceptances arrive as notifications; refetch the graph so an
  // invite that lands while this page is open shows up without a reload.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNotif = (n) => {
      if (n.type === "connection_request" || n.type === "connection_accepted") loadGraph();
    };
    socket.on("notification:new", onNotif);
    return () => socket.off("notification:new", onNotif);
  }, [loadGraph]);

  // Any state change ripples across tabs (accepting moves a row), so refetch.
  const refresh = () => {
    loadGraph();
    if (tab === "discover") loadDiscover(q);
  };

  const counts = {
    invitations: pending.length,
    connections: connections.length,
    sent: sent.length,
    discover: discover.length,
  };

  function grid(list, render, empty) {
    if (list.length === 0) return <div className="card center muted">{empty}</div>;
    return <div className="person-grid">{list.map(render)}</div>;
  }

  return (
    <div className="container" style={{ maxWidth: 980 }}>
      <div className="spread" style={{ alignItems: "baseline" }}>
        <h2>My Network</h2>
        <span className="muted tiny">
          {connections.length} connection{connections.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => { setTab(t.key); if (t.key === "discover") loadDiscover(q); }}
          >
            <span className="material-symbols-outlined ui-ico">{t.ico}</span> {t.label}
            {counts[t.key] > 0 && <span className="tab-count">{counts[t.key]}</span>}
          </button>
        ))}
      </div>

      {error && <div className="card error">{error}</div>}

      {tab === "discover" && (
        <div className="card">
          <form
            className="row"
            onSubmit={(e) => { e.preventDefault(); loadDiscover(q); }}
          >
            <input
              placeholder="Search people by name, headline, location…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ margin: 0 }}
            />
            <button type="submit">Search</button>
            {q && (
              <button type="button" className="secondary" onClick={() => { setQ(""); loadDiscover(""); }}>
                Clear
              </button>
            )}
          </form>
        </div>
      )}

      {loading ? (
        <div className="spinner">Loading…</div>
      ) : tab === "invitations" ? (
        grid(
          pending,
          (p) => (
            <PersonCard key={p.id} p={p} meta={`Invited you ${since(p.created_at)}`}>
              <ConnectButton
                userId={p.id}
                initial={{ state: "pending_incoming", connection_id: p.connection_id }}
                onChange={refresh}
              />
            </PersonCard>
          ),
          "No pending invitations."
        )
      ) : tab === "connections" ? (
        grid(
          connections,
          (p) => (
            <PersonCard key={p.id} p={p} meta={p.connected_at ? `Connected ${since(p.connected_at)}` : null}>
              <Link to={`/messages/${p.id}`}>
                <button className="secondary small">
                  <span className="material-symbols-outlined ui-ico">chat_bubble</span> Message
                </button>
              </Link>
              <ConnectButton
                userId={p.id}
                initial={{ state: "connected", connection_id: p.connection_id }}
                onChange={refresh}
              />
            </PersonCard>
          ),
          "No connections yet. Try the Discover tab."
        )
      ) : tab === "sent" ? (
        grid(
          sent,
          (p) => (
            <PersonCard key={p.id} p={p} meta={`Sent ${since(p.created_at)}`}>
              <ConnectButton
                userId={p.id}
                initial={{ state: "pending_outgoing", connection_id: p.connection_id }}
                onChange={refresh}
              />
            </PersonCard>
          ),
          "No invitations awaiting a reply."
        )
      ) : (
        grid(
          discover,
          (p) => (
            <PersonCard
              key={p.id}
              p={p}
              meta={p.connection_count > 0 ? `${p.connection_count} connections` : null}
            >
              {/* No `initial` here: search results can include people already in
                  the graph, so let the button fetch the real relation. */}
              <ConnectButton userId={p.id} initial={q ? undefined : { state: "none", connection_id: null }} onChange={refresh} />
              <Link to={`/messages/${p.id}`}>
                <button className="ghost small">
                  <span className="material-symbols-outlined ui-ico">chat_bubble</span> Message
                </button>
              </Link>
            </PersonCard>
          ),
          q ? "No people matched that search." : "No suggestions right now."
        )
      )}
    </div>
  );
}
