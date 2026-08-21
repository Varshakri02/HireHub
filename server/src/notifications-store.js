// Notification data access + push. Every notification is a row the recipient can
// mark read; creating one also emits "notification:new" over the socket so badges
// update live.
import db from "./db.js";
import { emitToUser } from "./realtime.js";

// Types the client knows how to render (icon + link). Keep in sync with
// client/src/pages/Notifications.jsx.
export const TYPES = [
  "post_like",
  "post_comment",
  "connection_request",
  "connection_accepted",
  "application_received",
  "application_status",
];

const SELECT_ONE = `
  SELECT n.*, u.name AS actor_name, u.avatar_url AS actor_avatar,
         u.headline AS actor_headline
  FROM notifications n
  LEFT JOIN users u ON u.id = n.actor_id
  WHERE n.id = ?`;

// Insert + push. Self-notifications are dropped (you liking your own post).
export function notify({ userId, actorId = null, type, entityId = null, body = "" }) {
  if (!userId || Number(userId) === Number(actorId)) return null;
  const info = db
    .prepare(
      `INSERT INTO notifications (user_id, actor_id, type, entity_id, body)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, actorId, type, entityId, body);
  const row = db.prepare(SELECT_ONE).get(info.lastInsertRowid);
  emitToUser(userId, "notification:new", row);
  return row;
}

// Drop a notification that no longer applies (e.g. an unliked post, a withdrawn
// invite) so the list doesn't keep stale entries.
export function unnotify({ userId, actorId, type, entityId }) {
  db.prepare(
    `DELETE FROM notifications
     WHERE user_id = ? AND actor_id = ? AND type = ?
       AND (entity_id IS ? OR entity_id = ?)`
  ).run(userId, actorId, type, entityId ?? null, entityId ?? null);
}

export function listNotifications(userId, limit = 100) {
  return db
    .prepare(
      `SELECT n.*, u.name AS actor_name, u.avatar_url AS actor_avatar,
              u.headline AS actor_headline
       FROM notifications n
       LEFT JOIN users u ON u.id = n.actor_id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC, n.id DESC
       LIMIT ?`
    )
    .all(userId, limit);
}

export function unreadCount(userId) {
  return db
    .prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read = 0")
    .get(userId).n;
}

export function markAllRead(userId) {
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0").run(userId);
}

export function markOneRead(userId, id) {
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(id, userId);
}

// Demo data (and any pre-upgrade activity) predates this table, so the page would
// look empty on a fresh deploy. Mint the missing rows once, idempotently: an
// application implies a notification for the poster, a non-pending status implies
// one for the applicant. Runs on boot; NOT EXISTS keeps it a no-op afterwards.
export function backfillNotifications() {
  db.exec(`
    INSERT INTO notifications (user_id, actor_id, type, entity_id, body, read, created_at)
    SELECT j.poster_id, a.applicant_id, 'application_received', a.job_id, j.title, 1, a.created_at
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE j.poster_id <> a.applicant_id
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = j.poster_id AND n.actor_id = a.applicant_id
          AND n.type = 'application_received' AND n.entity_id = a.job_id
      );

    INSERT INTO notifications (user_id, actor_id, type, entity_id, body, read, created_at)
    SELECT a.applicant_id, j.poster_id, 'application_status', a.job_id,
           j.title || '|' || a.status, 1, a.created_at
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.status <> 'pending' AND j.poster_id <> a.applicant_id
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = a.applicant_id AND n.type = 'application_status'
          AND n.entity_id = a.job_id
      );
  `);
}
