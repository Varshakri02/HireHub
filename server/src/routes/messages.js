// REST for chat history. Live delivery is over Socket.io (see index.js).
import { Router } from "express";
import { requireAuth } from "../auth.js";
import {
  conversation,
  conversationList,
  markRead,
} from "../messages-store.js";

const router = Router();

// Inbox: list of conversations with last message + unread counts.
router.get("/", requireAuth, (req, res) => {
  res.json(conversationList(req.user.id));
});

// Full thread with one user. Marks their messages to me as read.
router.get("/:userId", requireAuth, (req, res) => {
  const other = Number(req.params.userId);
  markRead(req.user.id, other);
  res.json(conversation(req.user.id, other));
});

export default router;
