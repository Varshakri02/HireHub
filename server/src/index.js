// HireHub API server: Express REST + Socket.io real-time chat.
import express from "express";
import cors from "cors";
import http from "node:http";
import { Server as SocketServer } from "socket.io";

import { PORT, CLIENT_ORIGIN, UPLOAD_DIR } from "./config.js";
import { verifyToken } from "./auth.js";
import { insertMessage, markRead } from "./messages-store.js";
import { seedDemo } from "./seed.js";
import { seedSocial } from "./social-seed.js";
import { setIO } from "./realtime.js";
import { backfillNotifications } from "./notifications-store.js";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import jobRoutes from "./routes/jobs.js";
import applicationRoutes from "./routes/applications.js";
import postRoutes from "./routes/posts.js";
import messageRoutes from "./routes/messages.js";
import uploadRoutes from "./routes/upload.js";
import experienceRoutes from "./routes/experiences.js";
import adminRoutes from "./routes/admin.js";
import connectionRoutes from "./routes/connections.js";
import notificationRoutes from "./routes/notifications.js";

// Populate demo recruiters/jobs/applications on first boot (idempotent).
seedDemo();
// Demo posts + connection graph + likes/comments (idempotent).
seedSocial();
// Mint notifications for activity that predates the notifications table.
backfillNotifications();

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

// Uploaded documents served statically.
app.use("/uploads", express.static(UPLOAD_DIR));

// The API has no UI of its own; send anyone opening the bare URL to the client.
app.get("/", (req, res) => res.redirect(CLIENT_ORIGIN));
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/notifications", notificationRoutes);

const server = http.createServer(app);
const io = new SocketServer(server, { cors: { origin: CLIENT_ORIGIN } });
// Share the instance so REST routes can push notifications (see realtime.js).
setIO(io);

// Authenticate every socket via the JWT sent in handshake auth.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token"));
  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.user.id;
  // Personal room so we can target a user across all their tabs/devices.
  socket.join(`user:${userId}`);

  // { to: <userId>, body: <string> }
  socket.on("message:send", (payload, ack) => {
    const to = Number(payload?.to);
    const body = (payload?.body || "").trim();
    if (!to || !body) {
      if (typeof ack === "function") ack({ error: "to and body required" });
      return;
    }
    const msg = insertMessage(userId, to, body);
    // Deliver to recipient and echo to sender's other tabs.
    io.to(`user:${to}`).emit("message:new", msg);
    io.to(`user:${userId}`).emit("message:new", msg);
    if (typeof ack === "function") ack({ ok: true, message: msg });
  });

  // Recipient opened the thread → clear unread for that sender.
  socket.on("message:read", ({ from }) => {
    if (from) markRead(userId, Number(from));
  });

  // Typing indicator relay.
  socket.on("typing", ({ to }) => {
    if (to) io.to(`user:${Number(to)}`).emit("typing", { from: userId });
  });
});

server.listen(PORT, () => {
  console.log(`HireHub API listening on http://localhost:${PORT}`);
});
