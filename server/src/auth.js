// Auth helpers: JWT sign/verify + Express middleware.
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./config.js";
import db from "./db.js";

export function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Requires a valid Bearer token. Attaches req.user = { id, email }.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Requires a valid token AND the is_admin flag on the user (checked in DB,
// so a revoked/old token can't grant admin). Attaches req.user.
export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const row = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.user.id);
    if (!row || !row.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  });
}
