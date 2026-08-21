// SQLite database via Node's built-in node:sqlite (no native build needed).
// Schema created on first run (idempotent).
import { DatabaseSync } from "node:sqlite";
import { DB_PATH, ADMIN_EMAIL } from "./config.js";

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  headline      TEXT    DEFAULT '',
  bio           TEXT    DEFAULT '',
  location      TEXT    DEFAULT '',
  avatar_url    TEXT    DEFAULT '',
  banner_url    TEXT    DEFAULT '',
  is_admin      INTEGER NOT NULL DEFAULT 0,
  is_recruiter  INTEGER NOT NULL DEFAULT 0,
  skills        TEXT    DEFAULT '',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  poster_id      INTEGER NOT NULL,
  title          TEXT    NOT NULL,
  company        TEXT    NOT NULL,
  location       TEXT    DEFAULT '',
  type           TEXT    DEFAULT 'Full-time',
  workplace      TEXT    DEFAULT 'Remote',
  experience     TEXT    DEFAULT 'Mid-Senior level',
  description    TEXT    DEFAULT '',
  responsibilities TEXT  DEFAULT '',
  skills         TEXT    DEFAULT '',
  salary         TEXT    DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poster_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS experiences (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  title       TEXT    NOT NULL,
  company     TEXT    NOT NULL,
  emp_type    TEXT    DEFAULT 'Full-time',
  location    TEXT    DEFAULT '',
  start_date  TEXT    DEFAULT '',
  end_date    TEXT    DEFAULT '',
  description TEXT    DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id    INTEGER NOT NULL,
  job_id     INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, job_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id)  REFERENCES jobs(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id       INTEGER NOT NULL,
  applicant_id INTEGER NOT NULL,
  cover_letter TEXT    DEFAULT '',
  resume_url   TEXT    DEFAULT '',
  status       TEXT    NOT NULL DEFAULT 'pending',
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (job_id, applicant_id),
  FOREIGN KEY (job_id)       REFERENCES jobs(id)  ON DELETE CASCADE,
  FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS posts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id  INTEGER NOT NULL,
  body       TEXT    DEFAULT '',
  doc_url    TEXT    DEFAULT '',
  doc_name   TEXT    DEFAULT '',
  doc_type   TEXT    DEFAULT '',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id   INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  body        TEXT    NOT NULL,
  read        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_jobs_created      ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_apps_job          ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_apps_applicant    ON applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_posts_created     ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_msgs_pair         ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_exp_user           ON experiences(user_id);
`);


// ---- Social layer (likes, comments, connections, notifications) -------------
db.exec(`
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    INTEGER NOT NULL,
  user_id    INTEGER NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL,
  author_id  INTEGER NOT NULL,
  body       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (post_id)   REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- One row per pair. requester_id is whoever sent the invite; status flips to
-- 'accepted' when the addressee accepts. Declines/withdrawals delete the row.
CREATE TABLE IF NOT EXISTS connections (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id  INTEGER NOT NULL,
  addressee_id  INTEGER NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'pending',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  responded_at  TEXT,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id),
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
);

-- user_id is the recipient. actor_id is who caused it (nullable for system rows).
-- entity_id points at the post/job/connection the notification is about.
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  actor_id   INTEGER,
  type       TEXT    NOT NULL,
  entity_id  INTEGER,
  body       TEXT    DEFAULT '',
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_likes_post      ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post    ON post_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conn_requester   ON connections(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_conn_addressee   ON connections(addressee_id, status);
CREATE INDEX IF NOT EXISTS idx_notif_user       ON notifications(user_id, read, created_at);
`);
// Additive migrations for DBs created before these columns existed.
// node:sqlite has no "ADD COLUMN IF NOT EXISTS", so ignore "duplicate column" errors.
for (const stmt of [
  "ALTER TABLE users ADD COLUMN banner_url TEXT DEFAULT ''",
  "ALTER TABLE jobs ADD COLUMN workplace TEXT DEFAULT 'Remote'",
  "ALTER TABLE jobs ADD COLUMN experience TEXT DEFAULT 'Mid-Senior level'",
  "ALTER TABLE jobs ADD COLUMN responsibilities TEXT DEFAULT ''",
  "ALTER TABLE jobs ADD COLUMN skills TEXT DEFAULT ''",
  "ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN is_recruiter INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE users ADD COLUMN skills TEXT DEFAULT ''",
]) {
  try {
    db.exec(stmt);
  } catch {
    /* column already exists — fine */
  }
}

// Promote the configured admin account if it already exists.
try {
  db.prepare("UPDATE users SET is_admin = 1 WHERE email = ?").run(ADMIN_EMAIL);
} catch {
  /* users table not ready — ignore */
}

export default db;
