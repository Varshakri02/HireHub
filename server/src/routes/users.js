// User directory + profile view/edit.
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";
import { publicUser } from "./auth.js";

const router = Router();

// List/search people (for the directory + chat "new message" picker).
router.get("/", requireAuth, (req, res) => {
  const q = `%${(req.query.q || "").toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT * FROM users
       WHERE lower(name) LIKE ? OR lower(headline) LIKE ? OR lower(location) LIKE ?
       ORDER BY name LIMIT 50`
    )
    .all(q, q, q);
  res.json(rows.map(publicUser));
});

router.get("/:id", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(publicUser(user));
});

// Edit own profile only.
router.put("/me", requireAuth, (req, res) => {
  const { name, headline, bio, location, avatar_url, banner_url, skills } = req.body || {};
  const current = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!current) return res.status(404).json({ error: "User not found" });

  db.prepare(
    `UPDATE users SET
       name = ?, headline = ?, bio = ?, location = ?, avatar_url = ?, banner_url = ?, skills = ?
     WHERE id = ?`
  ).run(
    name ?? current.name,
    headline ?? current.headline,
    bio ?? current.bio,
    location ?? current.location,
    avatar_url ?? current.avatar_url,
    banner_url ?? current.banner_url,
    skills ?? current.skills,
    req.user.id
  );

  const updated = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  res.json(publicUser(updated));
});

// "People also viewed" — a few other users to suggest (excludes me).
router.get("/suggestions/people", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM users WHERE id != ? ORDER BY created_at DESC LIMIT 5")
    .all(req.user.id);
  res.json(rows.map(publicUser));
});

export default router;
