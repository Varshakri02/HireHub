// Admin oversight API — view all user-to-user messages. Admin-only.
import { Router } from "express";
import { requireAdmin } from "../auth.js";
import {
  allConversations,
  adminThread,
  searchMessages,
  messageStats,
} from "../messages-store.js";

const router = Router();

// Dashboard headline numbers.
router.get("/stats", requireAdmin, (req, res) => {
  res.json(messageStats());
});

// Every conversation on the platform (one row per user pair).
router.get("/conversations", requireAdmin, (req, res) => {
  res.json(allConversations());
});

// Full thread between two specific users.
router.get("/conversations/:a/:b", requireAdmin, (req, res) => {
  const a = Number(req.params.a);
  const b = Number(req.params.b);
  if (!a || !b) return res.status(400).json({ error: "two user ids required" });
  res.json(adminThread(a, b));
});

// Flat search across all messages (body or participant name).
router.get("/messages", requireAdmin, (req, res) => {
  res.json(searchMessages(req.query.q || ""));
});

export default router;
