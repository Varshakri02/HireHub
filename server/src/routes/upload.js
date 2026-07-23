// File uploads (resumes, post documents). Stored on disk, served statically.
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { UPLOAD_DIR } from "../config.js";
import { requireAuth } from "../auth.js";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Prefix with user id + timestamp to avoid collisions; keep a safe extension.
    const ext = path.extname(file.originalname).slice(0, 10);
    const base = `${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, base + ext);
  },
});

const ALLOWED = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/gif",
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(new Error("Unsupported file type"));
  },
});

const router = Router();

router.post("/", requireAuth, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      name: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
    });
  });
});

export default router;
