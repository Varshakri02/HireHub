// Apply to jobs, list my applications, update status (job owner only).
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

// Apply to a job. resume_url comes from a prior /upload response.
router.post("/", requireAuth, (req, res) => {
  const { job_id, cover_letter, resume_url } = req.body || {};
  if (!job_id) return res.status(400).json({ error: "job_id required" });

  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(job_id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.poster_id === req.user.id) {
    return res.status(400).json({ error: "Cannot apply to your own posting" });
  }

  const exists = db
    .prepare("SELECT id FROM applications WHERE job_id = ? AND applicant_id = ?")
    .get(job_id, req.user.id);
  if (exists) return res.status(409).json({ error: "Already applied" });

  const info = db
    .prepare(
      `INSERT INTO applications (job_id, applicant_id, cover_letter, resume_url)
       VALUES (?, ?, ?, ?)`
    )
    .run(job_id, req.user.id, cover_letter || "", resume_url || "");
  const app = db
    .prepare("SELECT * FROM applications WHERE id = ?")
    .get(info.lastInsertRowid);
  res.status(201).json(app);
});

// Applications I submitted.
router.get("/mine", requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, j.title AS job_title, j.company AS job_company, j.location AS job_location
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.applicant_id = ? ORDER BY a.created_at DESC`
    )
    .all(req.user.id);
  res.json(rows);
});

// Update application status — only the job's poster may do this.
router.put("/:id/status", requireAuth, (req, res) => {
  const { status } = req.body || {};
  const allowed = ["pending", "reviewing", "accepted", "rejected"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${allowed.join(", ")}` });
  }
  const app = db.prepare("SELECT * FROM applications WHERE id = ?").get(req.params.id);
  if (!app) return res.status(404).json({ error: "Application not found" });
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(app.job_id);
  if (job.poster_id !== req.user.id) {
    return res.status(403).json({ error: "Not authorized" });
  }
  db.prepare("UPDATE applications SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ...app, status });
});

export default router;
