// Demo seed + recruiter enrichment.
//  * seedDemo() (first boot only): 5 recruiters (rec1..rec5), 50 randomized jobs,
//    candidate accounts, sample applications.
//  * enrichRecruiters() (every boot, idempotent): fills each recruiter with randomly
//    generated profile details (name, headline, location, bio) + a work-experience
//    history, if they don't already have them. Preserves existing jobs/applications.
import bcrypt from "bcryptjs";
import db from "./db.js";

const EXPERIENCE = ["Internship", "Entry level", "Associate", "Mid-Senior level"];
const TYPES = ["Full-time", "Part-time", "Contract", "Internship"];
const WORKPLACES = ["Remote", "On-site", "Hybrid"];

const COMPANIES = [
  "Nimbus Cloud", "Vertex Labs", "Orbit Health", "Ironclad Security",
  "BrightWave Media", "Quanta Financial", "Terraform Logistics", "Nova Robotics",
  "Pixel Forge", "Summit Analytics", "Harbor Systems", "Lumen AI",
  "Cobalt Retail", "Everest Biotech", "Fathom Games",
];
const LOCATIONS = [
  "San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA",
  "Boston, MA", "Denver, CO", "Chicago, IL", "Remote, US", "London, UK", "Bengaluru, IN",
];
const TITLES = [
  ["Frontend Engineer", ["React", "TypeScript", "CSS", "Vite", "Testing"]],
  ["Backend Engineer", ["Node.js", "PostgreSQL", "REST", "Docker", "AWS"]],
  ["Full-Stack Developer", ["React", "Node.js", "SQL", "CI/CD", "GraphQL"]],
  ["Data Analyst", ["SQL", "Python", "Tableau", "Statistics", "ETL"]],
  ["Data Scientist", ["Python", "ML", "Pandas", "SQL", "TensorFlow"]],
  ["DevOps Engineer", ["Kubernetes", "Terraform", "AWS", "CI/CD", "Linux"]],
  ["Product Designer", ["Figma", "Prototyping", "UX Research", "Design Systems"]],
  ["Product Manager", ["Roadmapping", "Analytics", "Agile", "Stakeholders"]],
  ["QA Engineer", ["Playwright", "Automation", "Jest", "Test Plans"]],
  ["Mobile Engineer", ["React Native", "Swift", "Kotlin", "REST"]],
  ["Security Engineer", ["AppSec", "Threat Modeling", "SIEM", "Python"]],
  ["ML Engineer", ["PyTorch", "MLOps", "Python", "Kubernetes"]],
];
const SALARIES = ["$70k", "$85k", "$100k", "$120k", "$140k", "$160k", "$185k"];

// ---- Recruiter identity pools --------------------------------------------------
const FIRST = ["Sarah", "Marcus", "Priya", "David", "Elena", "Jordan", "Aisha", "Liam", "Nina", "Carlos"];
const LAST = ["Chen", "Okafor", "Sharma", "Bennett", "Rossi", "Nguyen", "Khan", "Walsh", "Petrova", "Mendez"];
const AGENCIES = ["Apex Talent", "Northstar Recruiting", "BluePeak Search", "HireForge", "Talent Foundry", "Summit Staffing"];
const SPECIALTIES = [
  "engineering and platform teams", "design and product roles", "data and ML hiring",
  "early-stage startup teams", "security and infrastructure talent", "full-stack and mobile teams",
];
const REC_LADDER = [
  "Recruiting Coordinator", "Technical Recruiter", "Senior Technical Recruiter",
  "Talent Acquisition Lead", "Head of Talent", "Director of Recruiting",
];
const REC_SKILLS = [
  "Full-cycle Recruiting", "Technical Sourcing", "Boolean Search", "Candidate Experience",
  "Stakeholder Management", "Offer Negotiation", "Employer Branding", "Greenhouse ATS",
  "Interview Design", "Talent Pipelining", "Diversity Hiring", "Workforce Planning",
];
const MONTHS = ["Jan", "Mar", "Apr", "Jun", "Aug", "Sep", "Oct"];

// Deterministic PRNG so generated profiles stay stable across restarts.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gpick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

// Build a full recruiter profile + experience history for recruiter number n.
function recruiterProfile(n) {
  const rng = mulberry32(n * 2654435761 + 12345);
  const first = gpick(rng, FIRST);
  const last = gpick(rng, LAST);
  const name = `${first} ${last}`;
  const agency = gpick(rng, AGENCIES);
  const location = gpick(rng, LOCATIONS);
  const specialty = gpick(rng, SPECIALTIES);

  // Career ladder: 3 roles, most recent first, current one ongoing.
  const top = 2 + Math.floor(rng() * (REC_LADDER.length - 3)); // index of current role
  const roles = [REC_LADDER[top], REC_LADDER[top - 1], REC_LADDER[top - 2]];
  const current = roles[0];

  // Strictly non-overlapping date ranges, newest first, walking back in time.
  const nowYear = 2025;
  const spans = [];
  let startY = nowYear - (1 + Math.floor(rng() * 3)); // current role start year
  spans.push({ start: `${gpick(rng, MONTHS)} ${startY}`, end: "Present" });
  for (let i = 1; i < roles.length; i++) {
    const endY = startY;                             // ended when the newer role began
    startY = endY - (2 + Math.floor(rng() * 3));     // 2–4 yr tenure
    spans.push({ start: `${gpick(rng, MONTHS)} ${startY}`, end: `${gpick(rng, MONTHS)} ${endY}` });
  }
  const years = nowYear - startY; // total career span from earliest role

  const headline = `${current} @ ${agency}`;
  const bio =
    `${first} is a ${current.toLowerCase()} with ${years}+ years connecting talent with ` +
    `high-growth teams. Focused on ${specialty}. Believes great hiring is about clarity, ` +
    `speed, and treating every candidate with respect.`;

  // 6 unique skills, deterministic per recruiter.
  const skillSet = [];
  const pool = [...REC_SKILLS];
  for (let i = 0; i < 6 && pool.length; i++) {
    skillSet.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  const skills = skillSet.join(", ");

  const companies = [agency, gpick(rng, AGENCIES.filter((a) => a !== agency)), gpick(rng, COMPANIES)];
  const experiences = roles.map((title, i) => ({
    title,
    company: companies[i],
    emp_type: "Full-time",
    location,
    start_date: spans[i].start,
    end_date: spans[i].end,
    description:
      i === 0
        ? `Leading ${specialty.split(" and ")[0]} hiring end to end — sourcing, structured interviews, offer strategy, and stakeholder partnering.`
        : `Owned full-cycle recruiting for ${gpick(rng, SPECIALTIES)}; built pipelines and improved time-to-hire.`,
  }));

  return { name, headline, location, bio, skills, experiences };
}

// ---- Shuffle / pick helpers for job seeding ------------------------------------
const pick = (a) => a[Math.floor(Math.random() * a.length)];
function sample(a, n) {
  const copy = [...a];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

// Fill in any recruiter that is missing profile details or experience history.
export function enrichRecruiters() {
  const recs = db.prepare("SELECT * FROM users WHERE is_recruiter = 1 ORDER BY id").all();
  const insertExp = db.prepare(
    `INSERT INTO experiences
       (user_id, title, company, emp_type, location, start_date, end_date, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  let filled = 0;
  for (const r of recs) {
    const m = String(r.email).match(/(\d+)/);
    const n = m ? parseInt(m[1], 10) : r.id;
    const p = recruiterProfile(n);
    const displayName = `rec${n}`; // keep the login name visible for identification

    // Each field backfilled independently (idempotent). Name always normalized to recN.
    const next = {
      name: displayName,
      headline: r.headline || p.headline,
      location: r.location || p.location,
      bio: r.bio || p.bio,
      skills: r.skills || p.skills,
    };
    const changed =
      r.name !== next.name || !r.headline || !r.location || !r.bio || !r.skills;
    if (changed) {
      db.prepare(
        "UPDATE users SET name = ?, headline = ?, location = ?, bio = ?, skills = ? WHERE id = ?"
      ).run(next.name, next.headline, next.location, next.bio, next.skills, r.id);
      filled++;
    }

    const expCount = db
      .prepare("SELECT COUNT(*) AS c FROM experiences WHERE user_id = ?")
      .get(r.id).c;
    if (expCount === 0) {
      for (const e of p.experiences) {
        insertExp.run(r.id, e.title, e.company, e.emp_type, e.location, e.start_date, e.end_date, e.description);
      }
    }
  }
  if (filled) console.log(`Enriched ${filled} recruiter profile(s) (name recN + details + skills).`);
}

export function seedDemo() {
  const exists = db.prepare("SELECT id FROM users WHERE email = 'rec1'").get();

  if (!exists) {
    const pw = bcrypt.hashSync("password", 8);
    const insertUser = db.prepare(
      "INSERT INTO users (name, email, password_hash, is_recruiter) VALUES (?, ?, ?, ?)"
    );
    const insertJob = db.prepare(
      `INSERT INTO jobs
         (poster_id, title, company, location, type, workplace, experience,
          description, responsibilities, skills, salary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertApp = db.prepare(
      "INSERT OR IGNORE INTO applications (job_id, applicant_id, cover_letter, status) VALUES (?, ?, ?, ?)"
    );

    // 5 recruiters (details filled by enrichRecruiters below).
    const recIds = [];
    for (let i = 1; i <= 5; i++) {
      const info = insertUser.run(`Recruiter ${i}`, `rec${i}`, pw, 1);
      recIds.push(Number(info.lastInsertRowid));
    }

    // 10 randomized jobs per recruiter.
    const jobIds = [];
    for (const rid of recIds) {
      for (let j = 0; j < 10; j++) {
        const [title, skillPool] = pick(TITLES);
        const company = pick(COMPANIES);
        const exp = pick(EXPERIENCE);
        const skills = sample(skillPool, 4).join(", ");
        const description =
          `${company} is hiring a ${title}. This is a placeholder posting for demo ` +
          `and filtering. ${exp} role; ${pick(WORKPLACES).toLowerCase()} arrangements available.`;
        const responsibilities =
          "Build and ship features end to end\n" +
          "Collaborate with cross-functional teams\n" +
          "Write clean, tested, maintainable code\n" +
          "Participate in code review and design discussions";
        const info = insertJob.run(
          rid, title, company, pick(LOCATIONS), pick(TYPES), pick(WORKPLACES), exp,
          description, responsibilities, skills, pick(SALARIES)
        );
        jobIds.push(Number(info.lastInsertRowid));
      }
    }

    // Candidate accounts (cand1..cand3) + sample applications.
    const candIds = [];
    for (let i = 1; i <= 3; i++) {
      const info = insertUser.run(`Candidate ${i}`, `cand${i}`, pw, 0);
      candIds.push(Number(info.lastInsertRowid));
    }
    const STATUS = ["pending", "pending", "reviewing", "accepted", "rejected"];
    const cover =
      "I'm excited about this role and believe my background is a strong match. " +
      "Happy to share more about relevant projects.";
    for (const cid of candIds) {
      for (const jid of sample(jobIds, 7)) {
        insertApp.run(jid, cid, cover, pick(STATUS));
      }
    }
    console.log("Seed: 5 recruiters (rec1..rec5), 50 jobs, 3 candidates, sample applications.");
  }

  // Always run — backfills recruiter details/experience (new or pre-existing DBs).
  enrichRecruiters();
}
