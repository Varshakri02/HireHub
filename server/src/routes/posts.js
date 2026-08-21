// Feed posts + their social layer (likes, comments).
// A post has text and/or an attached document (uploaded separately).
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { notify, unnotify } from "../notifications-store.js";

const router = Router();

// Shared projection: author info plus this viewer's like state and the counts.
const POST_COLS = `
  p.*, u.name AS author_name, u.headline AS author_headline,
  u.avatar_url AS author_avatar,
  (SELECT COUNT(*) FROM post_likes    l WHERE l.post_id = p.id) AS like_count,
  (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = p.id) AS comment_count,
  EXISTS(SELECT 1 FROM post_likes l WHERE l.post_id = p.id AND l.user_id = ?) AS liked_by_me`;

function getPost(postId, viewerId) {
  return db
    .prepare(
      `SELECT ${POST_COLS} FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`
    )
    .get(viewerId, postId);
}

// Global feed, newest first.
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ${POST_COLS}
       FROM posts p
       JOIN users u ON u.id = p.author_id
       ORDER BY p.created_at DESC LIMIT 100`
    )
    .all(req.user.id);
  res.json(rows);
});

// Posts by one user (for their profile).
router.get("/user/:id", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT ${POST_COLS}
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.author_id = ? ORDER BY p.created_at DESC`
    )
    .all(req.user.id, req.params.id);
  res.json(rows);
});

router.post("/", requireAuth, (req, res) => {
  const { body, doc_url, doc_name, doc_type } = req.body || {};
  if (!body && !doc_url) {
    return res.status(400).json({ error: "Post needs text or a document" });
  }
  const info = db
    .prepare(
      `INSERT INTO posts (author_id, body, doc_url, doc_name, doc_type)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.user.id, body || "", doc_url || "", doc_name || "", doc_type || "");
  res.status(201).json(getPost(info.lastInsertRowid, req.user.id));
});

router.delete("/:id", requireAuth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.author_id !== req.user.id) {
    return res.status(403).json({ error: "Not your post" });
  }
  // Likes and comments cascade via their FK on post_id. Notifications only carry a
  // loose entity_id, so clear the ones pointing at this post by hand.
  db.prepare("DELETE FROM notifications WHERE entity_id = ? AND type IN (?, ?)")
    .run(post.id, "post_like", "post_comment");
  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---- Likes -----------------------------------------------------------------

// Idempotent: liking twice is still one like.
router.post("/:id/like", requireAuth, (req, res) => {
  const post = db.prepare("SELECT id, author_id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const info = db
    .prepare("INSERT OR IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)")
    .run(post.id, req.user.id);
  // Only notify on a state change, so re-liking doesn't spam the author.
  if (info.changes > 0) {
    notify({
      userId: post.author_id,
      actorId: req.user.id,
      type: "post_like",
      entityId: post.id,
    });
  }
  res.json(getPost(post.id, req.user.id));
});

router.delete("/:id/like", requireAuth, (req, res) => {
  const post = db.prepare("SELECT id, author_id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  db.prepare("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?").run(
    post.id,
    req.user.id
  );
  // Pull the notification too — a like that no longer exists shouldn't sit in the list.
  unnotify({
    userId: post.author_id,
    actorId: req.user.id,
    type: "post_like",
    entityId: post.id,
  });
  res.json(getPost(post.id, req.user.id));
});

// Who liked a post (for the "You and 3 others" hover / count detail).
router.get("/:id/likes", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name, u.headline, u.avatar_url, l.created_at
       FROM post_likes l JOIN users u ON u.id = l.user_id
       WHERE l.post_id = ? ORDER BY l.created_at DESC`
    )
    .all(req.params.id);
  res.json(rows);
});

// ---- Comments --------------------------------------------------------------

router.get("/:id/comments", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT c.*, u.name AS author_name, u.headline AS author_headline,
              u.avatar_url AS author_avatar
       FROM post_comments c JOIN users u ON u.id = c.author_id
       WHERE c.post_id = ? ORDER BY c.created_at ASC`
    )
    .all(req.params.id);
  res.json(rows);
});

router.post("/:id/comments", requireAuth, (req, res) => {
  const body = (req.body?.body || "").trim();
  if (!body) return res.status(400).json({ error: "Comment cannot be empty" });
  if (body.length > 2000) return res.status(400).json({ error: "Comment too long" });

  const post = db.prepare("SELECT id, author_id FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const info = db
    .prepare("INSERT INTO post_comments (post_id, author_id, body) VALUES (?, ?, ?)")
    .run(post.id, req.user.id, body);
  const comment = db
    .prepare(
      `SELECT c.*, u.name AS author_name, u.headline AS author_headline,
              u.avatar_url AS author_avatar
       FROM post_comments c JOIN users u ON u.id = c.author_id WHERE c.id = ?`
    )
    .get(info.lastInsertRowid);

  notify({
    userId: post.author_id,
    actorId: req.user.id,
    type: "post_comment",
    entityId: post.id,
    body: body.slice(0, 140),
  });
  res.status(201).json(comment);
});

// A comment can be removed by its author or by the post's owner (moderation).
router.delete("/comments/:commentId", requireAuth, (req, res) => {
  const c = db
    .prepare(
      `SELECT c.*, p.author_id AS post_author_id
       FROM post_comments c JOIN posts p ON p.id = c.post_id WHERE c.id = ?`
    )
    .get(req.params.commentId);
  if (!c) return res.status(404).json({ error: "Comment not found" });
  if (c.author_id !== req.user.id && c.post_author_id !== req.user.id) {
    return res.status(403).json({ error: "Not allowed" });
  }
  db.prepare("DELETE FROM post_comments WHERE id = ?").run(c.id);
  res.json({ ok: true });
});

export default router;
