// People directory — search members and start a conversation.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";

export default function Network() {
  const { user } = useAuth();
  const [people, setPeople] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  function load(query = "") {
    setLoading(true);
    api.get("/users", { params: { q: query } })
      .then((r) => setPeople(r.data.filter((p) => p.id !== user?.id)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }
  useEffect(() => load(), []); // eslint-disable-line

  return (
    <div className="container" style={{ maxWidth: 820 }}>
      <h2>My Network</h2>
      <div className="card">
        <form className="row" onSubmit={(e) => { e.preventDefault(); load(q); }}>
          <input placeholder="Search people by name, headline, location…" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: 0 }} />
          <button type="submit">Search</button>
        </form>
      </div>
      {loading ? <div className="spinner">Loading…</div> :
        people.length === 0 ? <div className="card center muted">No people found.</div> :
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {people.map((p) => (
            <div className="card center" key={p.id} style={{ marginBottom: 0 }}>
              <Link to={`/profile/${p.id}`}><Avatar user={p} size={64} /></Link>
              <h4 style={{ margin: "8px 0 2px" }}><Link to={`/profile/${p.id}`}>{p.name}</Link></h4>
              <div className="muted tiny" style={{ minHeight: 32 }}>{p.headline}</div>
              <div className="muted tiny">{p.location}</div>
              <Link to={`/messages/${p.id}`}><button className="secondary small block" style={{ marginTop: 10 }}><span className="material-symbols-outlined ui-ico">chat_bubble</span> Message</button></Link>
            </div>
          ))}
        </div>}
    </div>
  );
}
