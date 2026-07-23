// Shared message data access — used by both REST routes and the Socket.io layer.
import db from "./db.js";

export function insertMessage(senderId, receiverId, body) {
  const info = db
    .prepare(
      "INSERT INTO messages (sender_id, receiver_id, body) VALUES (?, ?, ?)"
    )
    .run(senderId, receiverId, body);
  return db.prepare("SELECT * FROM messages WHERE id = ?").get(info.lastInsertRowid);
}

// Full thread between two users, oldest first.
export function conversation(userA, userB) {
  return db
    .prepare(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`
    )
    .all(userA, userB, userB, userA);
}

// One row per conversation partner with the last message + unread count.
export function conversationList(userId) {
  return db
    .prepare(
      `SELECT
         other.id           AS user_id,
         other.name         AS name,
         other.avatar_url   AS avatar_url,
         other.headline     AS headline,
         last.body          AS last_body,
         last.created_at    AS last_at,
         last.sender_id     AS last_sender_id,
         (SELECT COUNT(*) FROM messages m2
            WHERE m2.sender_id = other.id AND m2.receiver_id = ? AND m2.read = 0
         ) AS unread
       FROM (
         SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id,
                MAX(id) AS last_id
         FROM messages
         WHERE sender_id = ? OR receiver_id = ?
         GROUP BY other_id
       ) grp
       JOIN users other ON other.id = grp.other_id
       JOIN messages last ON last.id = grp.last_id
       ORDER BY last.created_at DESC`
    )
    .all(userId, userId, userId, userId);
}

export function markRead(readerId, otherId) {
  db.prepare(
    "UPDATE messages SET read = 1 WHERE receiver_id = ? AND sender_id = ?"
  ).run(readerId, otherId);
}

// ---- Admin oversight (read-only, never marks read) --------------------------

// Every conversation across the whole platform: one row per unordered user pair
// with both participants + the last message + total count. Newest activity first.
export function allConversations() {
  return db
    .prepare(
      `SELECT
         pair.u1                AS user_a_id,
         ua.name                AS user_a_name,
         ua.avatar_url          AS user_a_avatar,
         pair.u2                AS user_b_id,
         ub.name                AS user_b_name,
         ub.avatar_url          AS user_b_avatar,
         pair.total             AS total,
         last.body              AS last_body,
         last.created_at        AS last_at,
         last.sender_id         AS last_sender_id
       FROM (
         SELECT
           CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END AS u1,
           CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END AS u2,
           MAX(id)   AS last_id,
           COUNT(*)  AS total
         FROM messages
         GROUP BY u1, u2
       ) pair
       JOIN users ua    ON ua.id = pair.u1
       JOIN users ub    ON ub.id = pair.u2
       JOIN messages last ON last.id = pair.last_id
       ORDER BY last.created_at DESC`
    )
    .all();
}

// Full thread between two users, with sender/receiver names, oldest first.
export function adminThread(userA, userB) {
  return db
    .prepare(
      `SELECT m.*,
              s.name AS sender_name,   s.avatar_url AS sender_avatar,
              r.name AS receiver_name
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.receiver_id
       WHERE (m.sender_id = ? AND m.receiver_id = ?)
          OR (m.sender_id = ? AND m.receiver_id = ?)
       ORDER BY m.created_at ASC`
    )
    .all(userA, userB, userB, userA);
}

// Flat, newest-first message search across all users (matches body or either name).
export function searchMessages(q = "", limit = 200) {
  const like = `%${String(q).toLowerCase()}%`;
  return db
    .prepare(
      `SELECT m.*,
              s.name AS sender_name,   s.avatar_url AS sender_avatar,
              r.name AS receiver_name, r.avatar_url AS receiver_avatar
       FROM messages m
       JOIN users s ON s.id = m.sender_id
       JOIN users r ON r.id = m.receiver_id
       WHERE lower(m.body)  LIKE ?
          OR lower(s.name)  LIKE ?
          OR lower(r.name)  LIKE ?
       ORDER BY m.created_at DESC
       LIMIT ?`
    )
    .all(like, like, like, limit);
}

// Headline totals for the admin dashboard.
export function messageStats() {
  const totalMessages = db.prepare("SELECT COUNT(*) AS n FROM messages").get().n;
  const totalUsers = db.prepare("SELECT COUNT(*) AS n FROM users").get().n;
  const activeSenders = db
    .prepare("SELECT COUNT(DISTINCT sender_id) AS n FROM messages")
    .get().n;
  const conversations = db
    .prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT 1 FROM messages
         GROUP BY
           CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END,
           CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END
       )`
    )
    .get().n;
  return { totalMessages, totalUsers, activeSenders, conversations };
}
