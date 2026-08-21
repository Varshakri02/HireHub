// Connection state machine in one button. Renders the right action for the
// current relation and reports the new state up so counters can refresh.
//   none             → Connect
//   pending_outgoing → Pending (click withdraws)
//   pending_incoming → Accept  (+ Ignore)
//   connected        → Connected (click removes)
import { useEffect, useState } from "react";
import api, { errMsg } from "../api.js";

const LABEL = {
  none: { text: "Connect", ico: "person_add", cls: "" },
  pending_outgoing: { text: "Pending", ico: "hourglass_top", cls: "secondary" },
  pending_incoming: { text: "Accept", ico: "how_to_reg", cls: "" },
  connected: { text: "Connected", ico: "check", cls: "secondary" },
};

export default function ConnectButton({
  userId,
  initial,          // optional { state, connection_id } to skip the status fetch
  size = "small",
  onChange,
}) {
  const [rel, setRel] = useState(initial || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) { setRel(initial); return; }
    let alive = true;
    api
      .get(`/connections/status/${userId}`)
      .then((r) => alive && setRel(r.data))
      .catch(() => alive && setRel({ state: "none", connection_id: null }));
    return () => { alive = false; };
  }, [userId, initial]);

  async function run(fn) {
    setBusy(true); setError("");
    try {
      const next = await fn();
      setRel(next);
      onChange?.(next);
    } catch (e) {
      setError(errMsg(e));
      // A 409 means the server already moved past this state — resync rather than
      // leaving the button showing a stale action.
      try {
        const r = await api.get(`/connections/status/${userId}`);
        setRel(r.data);
      } catch { /* keep the error visible */ }
    } finally {
      setBusy(false);
    }
  }

  if (!rel || rel.state === "self") return null;

  const connect = () => run(async () => (await api.post(`/connections/${userId}`)).data);
  const accept = () =>
    run(async () => (await api.put(`/connections/${rel.connection_id}/accept`)).data);
  const remove = (confirmMsg) =>
    run(async () => {
      if (confirmMsg && !confirm(confirmMsg)) return rel;
      return (await api.delete(`/connections/${rel.connection_id}`)).data;
    });

  const l = LABEL[rel.state] || LABEL.none;
  const onClick = {
    none: connect,
    pending_incoming: accept,
    pending_outgoing: () => remove("Withdraw this invitation?"),
    connected: () => remove("Remove this connection?"),
  }[rel.state];

  return (
    <span className="connect-wrap">
      <button className={`${l.cls} ${size}`.trim()} disabled={busy} onClick={onClick}>
        <span className="material-symbols-outlined ui-ico">{l.ico}</span>{" "}
        {busy ? "…" : l.text}
      </button>
      {rel.state === "pending_incoming" && (
        <button className="ghost small" disabled={busy} onClick={() => remove(null)}>
          Ignore
        </button>
      )}
      {error && <span className="error tiny">{error}</span>}
    </span>
  );
}
