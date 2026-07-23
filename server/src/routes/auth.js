// Register + login. Returns a JWT and the public user object.
import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { signToken, requireAuth } from "../auth.js";
import { DEMO_AUTH, ADMIN_EMAIL } from "../config.js";

// Promote the configured admin account the moment it appears. Returns the
// possibly-updated user row.
function ensureAdmin(user) {
  if (user && !user.is_admin && user.email === ADMIN_EMAIL) {
    db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(user.id);
    return db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  }
  return user;
}

// Turn "jane.doe@x.com" into "Jane Doe" for auto-created demo accounts.
function nameFromEmail(email) {
  const local = email.split("@")[0].replace(/[._-]+/g, " ");
  return local.replace(/\b\w/g, (c) => c.toUpperCase()) || "New User";
}

const router = Router();

// Strip sensitive fields before sending a user to the client.
export function publicUser(row) {
  if (!row) return null;
  const { password_hash, ...safe } = row;
  return safe;
}

router.post("/register", (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be 6+ characters" });
  }

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name, email.toLowerCase(), hash);

  const user = ensureAdmin(
    db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid)
  );
  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  const lc = email.toLowerCase();
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(lc);

  if (DEMO_AUTH) {
    // Accept anything: create the account on first login, skip the password check.
    if (!user) {
      const hash = bcrypt.hashSync(password, 10);
      const info = db
        .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
        .run(nameFromEmail(lc), lc, hash);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    }
    user = ensureAdmin(user);
    return res.json({ token: signToken(user), user: publicUser(user) });
  }

  // Real auth path (DEMO_AUTH=false).
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  user = ensureAdmin(user);
  res.json({ token: signToken(user), user: publicUser(user) });
});

// Current logged-in user (used to restore session on page load).
router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

export default router;
