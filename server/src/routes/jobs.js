// Job postings: list/search, view, create, delete (owner only), save/unsave, + applications.
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

// List with poster info + application count. Supports ?q= and ?location= search.
router.get("/", requireAuth, (req, res) => {
  const q = `%${(req.query.q || "").toLowerCase()}%`;
  const loc = `%${(req.query.location || "").toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT j.*, u.name AS poster_name, u.avatar_url AS poster_avatar,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count,
              EXISTS(SELECT 1 FROM saved_jobs s WHERE s.job_id = j.id AND s.user_id = ?) AS is_saved
       FROM jobs j
       JOIN users u ON u.id = j.poster_id
       WHERE (lower(j.title) LIKE ? OR lower(j.company) LIKE ?)
         AND lower(j.location) LIKE ?
       ORDER BY j.created_at DESC`
    )
    .all(req.user.id, q, q, loc);
  res.json(rows);
});

// Jobs the current user saved.
router.get("/saved", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT j.*, u.name AS poster_name, u.avatar_url AS poster_avatar,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count,
              1 AS is_saved
       FROM saved_jobs s
       JOIN jobs j  ON j.id = s.job_id
       JOIN users u ON u.id = j.poster_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Postings created by the current user (recruiter dashboard) with counts.
router.get("/mine/postings", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT j.*,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'pending')   AS pending_count,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'reviewing') AS reviewing_count,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'accepted')  AS accepted_count
       FROM jobs j
       WHERE j.poster_id = ?
       ORDER BY j.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

router.get("/:id", requireAuth, (req, res) => {
  const job = db
    .prepare(
      `SELECT j.*, u.name AS poster_name, u.avatar_url AS poster_avatar,
              u.headline AS poster_headline,
              (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count,
              EXISTS(SELECT 1 FROM saved_jobs s WHERE s.job_id = j.id AND s.user_id = ?) AS is_saved
       FROM jobs j JOIN users u ON u.id = j.poster_id WHERE j.id = ?`
    )
    .get(req.user.id, req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const mine = db
    .prepare("SELECT id, status FROM applications WHERE job_id = ? AND applicant_id = ?")
    .get(req.params.id, req.user.id);
  res.json({ ...job, my_application: mine || null });
});

router.post("/", requireAuth, (req, res) => {
  const {
    title, company, location, type, workplace, experience,
    description, responsibilities, skills, salary,
  } = req.body || {};
  if (!title || !company) {
    return res.status(400).json({ error: "title and company required" });
  }
  const info = db
    .prepare(
      `INSERT INTO jobs
        (poster_id, title, company, location, type, workplace, experience,
         description, responsibilities, skills, salary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.user.id,
      title,
      company,
      location || "",
      type || "Full-time",
      workplace || "Remote",
      experience || "Mid-Senior level",
      description || "",
      responsibilities || "",
      skills || "",
      salary || ""
    );
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(job);
});

router.delete("/:id", requireAuth, (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.poster_id !== req.user.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }
  db.prepare("DELETE FROM jobs WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Save / unsave a job.
router.post("/:id/save", requireAuth, (req, res) => {
  const job = db.prepare("SELECT id FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  db.prepare(
    "INSERT OR IGNORE INTO saved_jobs (user_id, job_id) VALUES (?, ?)"
  ).run(req.user.id, req.params.id);
  res.json({ saved: true });
});

router.delete("/:id/save", requireAuth, (req, res) => {
  db.prepare("DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?").run(
    req.user.id,
    req.params.id
  );
  res.json({ saved: false });
});

// Applicants for a job — poster only.
router.get("/:id/applications", requireAuth, (req, res) => {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.poster_id !== req.user.id) {
    return res.status(403).json({ error: "Not your job posting" });
  }
  const rows = db
    .prepare(
      `SELECT a.*, u.name AS applicant_name, u.headline AS applicant_headline,
              u.avatar_url AS applicant_avatar
       FROM applications a
       JOIN users u ON u.id = a.applicant_id
       WHERE a.job_id = ? ORDER BY a.created_at DESC`
    )
    .all(req.params.id);
  res.json(rows);
});

export default router;
