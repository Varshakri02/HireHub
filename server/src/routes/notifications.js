// Notification inbox. Rows are written by whatever caused them (likes, comments,
// invites, applications); this route only reads them and marks them read.
import { Router } from "express";
import { requireAuth } from "../auth.js";
import {
  listNotifications,
  unreadCount,
  markAllRead,
  markOneRead,
} from "../notifications-store.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  res.json(listNotifications(req.user.id));
});

router.get("/unread-count", requireAuth, (req, res) => {
  res.json({ count: unreadCount(req.user.id) });
});

router.put("/read-all", requireAuth, (req, res) => {
  markAllRead(req.user.id);
  res.json({ ok: true, count: 0 });
});

router.put("/:id/read", requireAuth, (req, res) => {
  markOneRead(req.user.id, Number(req.params.id));
  res.json({ ok: true, count: unreadCount(req.user.id) });
});

export default router;
