// Connection graph: invite, accept, decline/withdraw/remove, list, suggest.
// One row per pair (see the UNIQUE + CHECK on the connections table). "pending"
// means requester_id is waiting on addressee_id; declining deletes the row so the
// pair can try again later.
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { notify, unnotify } from "../notifications-store.js";

const router = Router();

// The row between me and someone else, whichever direction it was sent.
function edge(a, b) {
  return db
    .prepare(
      `SELECT * FROM connections
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)`
    )
    .get(a, b, b, a);
}

// What the profile button should show: none | pending_outgoing | pending_incoming | connected.
function relation(meId, otherId) {
  if (Number(meId) === Number(otherId)) return { state: "self", connection_id: null };
  const row = edge(meId, otherId);
  if (!row) return { state: "none", connection_id: null };
  if (row.status === "accepted") return { state: "connected", connection_id: row.id };
  return {
    state: row.requester_id === Number(meId) ? "pending_outgoing" : "pending_incoming",
    connection_id: row.id,
  };
}

const PERSON = "u.id, u.name, u.headline, u.location, u.avatar_url, u.is_recruiter";

// My accepted connections.
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ${PERSON}, c.id AS connection_id, c.responded_at AS connected_at
       FROM connections c
       JOIN users u ON u.id = CASE WHEN c.requester_id = ? THEN c.addressee_id ELSE c.requester_id END
       WHERE (c.requester_id = ? OR c.addressee_id = ?) AND c.status = 'accepted'
       ORDER BY c.responded_at DESC`
    )
    .all(req.user.id, req.user.id, req.user.id);
  res.json(rows);
});

// Invitations waiting on me.
router.get("/pending", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ${PERSON}, c.id AS connection_id, c.created_at
       FROM connections c JOIN users u ON u.id = c.requester_id
       WHERE c.addressee_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Invitations I sent that have not been answered.
router.get("/sent", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ${PERSON}, c.id AS connection_id, c.created_at
       FROM connections c JOIN users u ON u.id = c.addressee_id
       WHERE c.requester_id = ? AND c.status = 'pending'
       ORDER BY c.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// People with no edge to me at all. Recruiters first, then newest accounts.
router.get("/suggestions", requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 12, 50);
  const rows = db
    .prepare(
      `SELECT ${PERSON},
              (SELECT COUNT(*) FROM connections c2
                 WHERE (c2.requester_id = u.id OR c2.addressee_id = u.id)
                   AND c2.status = 'accepted') AS connection_count
       FROM users u
       WHERE u.id <> ?
         AND NOT EXISTS (
           SELECT 1 FROM connections c
           WHERE (c.requester_id = ? AND c.addressee_id = u.id)
              OR (c.requester_id = u.id AND c.addressee_id = ?)
         )
       ORDER BY u.is_recruiter DESC, u.created_at DESC
       LIMIT ?`
    )
    .all(req.user.id, req.user.id, req.user.id, limit);
  res.json(rows);
});

// Accepted-connection count for any user (drives the profile stat).
router.get("/count/:userId", requireAuth, (req, res) => {
  const n = db
    .prepare(
      `SELECT COUNT(*) AS n FROM connections
       WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted'`
    )
    .get(req.params.userId, req.params.userId).n;
  res.json({ count: n });
});

// My relationship with one user.
router.get("/status/:userId", requireAuth, (req, res) => {
  res.json(relation(req.user.id, Number(req.params.userId)));
});

// Accept an invite addressed to me. Shared by POST /:userId and PUT /:id/accept.
function acceptEdge(row, req, res) {
  db.prepare(
    "UPDATE connections SET status = 'accepted', responded_at = datetime('now') WHERE id = ?"
  ).run(row.id);
  // The request notification is spent; replace it with an acceptance for the sender.
  unnotify({
    userId: req.user.id,
    actorId: row.requester_id,
    type: "connection_request",
    entityId: row.id,
  });
  notify({
    userId: row.requester_id,
    actorId: req.user.id,
    type: "connection_accepted",
    entityId: row.id,
  });
  return res.json(relation(req.user.id, row.requester_id));
}

// Send an invite. If they already invited me, this accepts instead — the natural
// read of "connect" when their request is already sitting in my inbox.
router.post("/:userId", requireAuth, (req, res) => {
  const other = Number(req.params.userId);
  if (!other) return res.status(400).json({ error: "userId required" });
  if (other === req.user.id) {
    return res.status(400).json({ error: "Cannot connect to yourself" });
  }
  const target = db.prepare("SELECT id, name FROM users WHERE id = ?").get(other);
  if (!target) return res.status(404).json({ error: "User not found" });

  const existing = edge(req.user.id, other);
  if (existing) {
    if (existing.status === "accepted") {
      return res.status(409).json({ error: "Already connected" });
    }
    if (existing.requester_id === other) return acceptEdge(existing, req, res);
    return res.status(409).json({ error: "Invitation already sent" });
  }

  const info = db
    .prepare("INSERT INTO connections (requester_id, addressee_id) VALUES (?, ?)")
    .run(req.user.id, other);
  notify({
    userId: other,
    actorId: req.user.id,
    type: "connection_request",
    entityId: info.lastInsertRowid,
  });
  res.status(201).json(relation(req.user.id, other));
});

router.put("/:id/accept", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM connections WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Invitation not found" });
  if (row.addressee_id !== req.user.id) {
    return res.status(403).json({ error: "Not your invitation" });
  }
  if (row.status === "accepted") return res.json(relation(req.user.id, row.requester_id));
  return acceptEdge(row, req, res);
});

// Decline an invite, withdraw mine, or remove an existing connection — the same
// delete, allowed for either participant.
router.delete("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM connections WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Connection not found" });
  if (row.requester_id !== req.user.id && row.addressee_id !== req.user.id) {
    return res.status(403).json({ error: "Not your connection" });
  }
  db.prepare("DELETE FROM connections WHERE id = ?").run(row.id);
  // Clear the invite notification so a declined request does not linger.
  unnotify({
    userId: row.addressee_id,
    actorId: row.requester_id,
    type: "connection_request",
    entityId: row.id,
  });
  const other = row.requester_id === req.user.id ? row.addressee_id : row.requester_id;
  res.json(relation(req.user.id, other));
});

export default router;
