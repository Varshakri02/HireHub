// Feed posts. A post has text and/or an attached document (uploaded separately).
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

// Global feed, newest first.
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.headline AS author_headline,
              u.avatar_url AS author_avatar
       FROM posts p
       JOIN users u ON u.id = p.author_id
       ORDER BY p.created_at DESC LIMIT 100`
    )
    .all();
  res.json(rows);
});

// Posts by one user (for their profile).
router.get("/user/:id", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.headline AS author_headline,
              u.avatar_url AS author_avatar
       FROM posts p JOIN users u ON u.id = p.author_id
       WHERE p.author_id = ? ORDER BY p.created_at DESC`
    )
    .all(req.params.id);
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
  const post = db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.headline AS author_headline,
              u.avatar_url AS author_avatar
       FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`
    )
    .get(info.lastInsertRowid);
  res.status(201).json(post);
});

router.delete("/:id", requireAuth, (req, res) => {
  const post = db.prepare("SELECT * FROM posts WHERE id = ?").get(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.author_id !== req.user.id) {
    return res.status(403).json({ error: "Not your post" });
  }
  db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
