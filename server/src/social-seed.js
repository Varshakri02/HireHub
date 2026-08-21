// Demo content for the social layer: a handful of posts, an accepted connection
// graph, pending invitations, likes and comments. Runs on every boot and is
// idempotent — each step is skipped once its data exists, so real user activity is
// never touched or duplicated.
import db from "./db.js";

const POSTS = [
  "Closed three senior backend roles this week. The winning pattern: candidates who show their work beat candidates who list their tools.",
  "Hot take: take-home assignments should be capped at 90 minutes. Anything longer selects for free time, not skill.",
  "Shipped our design-system migration. 42 one-off components down to 11 primitives. Bundle dropped 18%.",
  "Six months into learning Kubernetes. What finally made it click: stop reading manifests, start breaking a cluster on purpose.",
  "Remote vs hybrid keeps getting framed as a perk question. It is a hiring-radius question. That is the whole argument.",
  "If your interview loop has five rounds, you are not being thorough, you are outsourcing your decision to fatigue.",
  "Reviewed 200 resumes this month. The ones that stood out led with impact numbers, not job titles.",
  "Reminder for anyone job hunting: a rejection after a final round is signal about fit, not about your worth. Keep going.",
];

const COMMENTS = [
  "This matches what we see on our side.",
  "Saved. Sharing with my team lead.",
  "Strong take — the second half especially.",
  "Been arguing this for a year, thank you.",
  "Any data behind this, or gut feel?",
  "Needed to read this today.",
  "Counterpoint: it depends heavily on team size.",
  "Following for the replies.",
];

// Deterministic PRNG so the demo graph is identical on every fresh boot.
function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedSocial() {
  const recs = db
    .prepare("SELECT id FROM users WHERE is_recruiter = 1 ORDER BY id")
    .all()
    .map((r) => r.id);
  // Demo candidates (cand1..candN) first so the seeded graph lands on the accounts
  // the README tells people to log in as, not on whatever ad-hoc accounts exist.
  const cands = db
    .prepare(
      `SELECT id FROM users
       WHERE is_recruiter = 0 AND is_admin = 0
       ORDER BY (email LIKE 'cand%') DESC, id
       LIMIT 6`
    )
    .all()
    .map((r) => r.id);
  const authors = [...recs, ...cands];
  if (authors.length < 2) return; // nothing to build a graph out of yet

  const r = rng(20240817);

  // --- Posts: only if the feed is empty, so a real user's feed is never padded.
  const postCount = db.prepare("SELECT COUNT(*) AS n FROM posts").get().n;
  // < 3 rather than 0: a dev DB with one throwaway post still gets a real feed.
  if (postCount < 3) {
    const insert = db.prepare(
      // Staggered created_at so the feed has a believable timeline instead of
      // eight posts sharing one timestamp.
      "INSERT INTO posts (author_id, body, created_at) VALUES (?, ?, datetime('now', ?))"
    );
    POSTS.forEach((body, i) => {
      const author = authors[i % authors.length];
      insert.run(author, body, `-${i * 7 + 2} hours`);
    });
  }

  const posts = db.prepare("SELECT id, author_id FROM posts ORDER BY id").all();

  // --- Connections: recruiters all know each other; each candidate is connected
  // to the first two recruiters and left with a pending invite from the third, so
  // logging in as a candidate shows a non-empty Network *and* a real invitation.
  const accepted = db.prepare(
    `INSERT OR IGNORE INTO connections (requester_id, addressee_id, status, responded_at)
     VALUES (?, ?, 'accepted', datetime('now', ?))`
  );
  const pending = db.prepare(
    `INSERT OR IGNORE INTO connections (requester_id, addressee_id, status, created_at)
     VALUES (?, ?, 'pending', datetime('now', ?))`
  );
  const hasEdge = db.prepare(
    `SELECT 1 FROM connections
     WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`
  );
  const link = (a, b, stmt, when) => {
    if (a === b || hasEdge.get(a, b, b, a)) return;
    stmt.run(a, b, when);
  };

  for (let i = 0; i < recs.length; i++) {
    for (let j = i + 1; j < recs.length; j++) {
      link(recs[i], recs[j], accepted, `-${(i + j) * 3 + 4} days`);
    }
  }
  cands.forEach((cid, idx) => {
    if (recs[0]) link(recs[0], cid, accepted, `-${idx + 2} days`);
    if (recs[1]) link(cid, recs[1], accepted, `-${idx + 5} days`);
    if (recs[2]) link(recs[2], cid, pending, `-${idx + 1} days`);
  });

  // --- Likes: spread across posts, skipping self-likes. Primary key makes the
  // insert idempotent, so re-running never double-counts.
  const like = db.prepare(
    "INSERT OR IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, datetime('now', ?))"
  );
  for (const p of posts) {
    const n = 2 + Math.floor(r() * Math.max(1, authors.length - 2));
    for (let k = 0; k < n; k++) {
      const uid = authors[Math.floor(r() * authors.length)];
      if (uid !== p.author_id) like.run(p.id, uid, `-${Math.floor(r() * 40)} hours`);
    }
  }

  // --- Comments: one pass, only on posts that have none, so user replies stay put.
  const commentCount = db.prepare(
    "SELECT COUNT(*) AS n FROM post_comments WHERE post_id = ?"
  );
  const comment = db.prepare(
    "INSERT INTO post_comments (post_id, author_id, body, created_at) VALUES (?, ?, ?, datetime('now', ?))"
  );
  posts.forEach((p, i) => {
    if (commentCount.get(p.id).n > 0) return;
    const n = i % 3 === 0 ? 0 : 1 + Math.floor(r() * 2);
    for (let k = 0; k < n; k++) {
      const uid = authors[Math.floor(r() * authors.length)];
      if (uid === p.author_id) continue;
      comment.run(p.id, uid, COMMENTS[Math.floor(r() * COMMENTS.length)], `-${1 + k * 3} hours`);
    }
  });
}
