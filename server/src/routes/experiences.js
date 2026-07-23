// Work experience entries shown on a profile. Add/delete on your own profile only.
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

router.get("/user/:id", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      "SELECT * FROM experiences WHERE user_id = ? ORDER BY id DESC"
    )
    .all(req.params.id);
  res.json(rows);
});

router.post("/", requireAuth, (req, res) => {
  const { title, company, emp_type, location, start_date, end_date, description } =
    req.body || {};
  if (!title || !company) {
    return res.status(400).json({ error: "title and company required" });
  }
  const info = db
    .prepare(
      `INSERT INTO experiences
        (user_id, title, company, emp_type, location, start_date, end_date, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      title,
      company,
      emp_type || "Full-time",
      location || "",
      start_date || "",
      end_date || "",
      description || ""
    );
  const row = db.prepare("SELECT * FROM experiences WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(row);
});

router.delete("/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM experiences WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.user_id !== req.user.id) {
    return res.status(403).json({ error: "Not your experience" });
  }
  db.prepare("DELETE FROM experiences WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
