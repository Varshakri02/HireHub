# HireHub — LinkedIn-style Job & Networking App

Full-stack job platform: profiles, a document feed, job posting + applications, and
real-time chat.

## Live demo

- **App:** https://client-steel-eta-12.vercel.app
- **API health:** https://hire-95iz.onrender.com/api/health

Demo auth is on — log in with **any** email + password (account auto-created).
Admin dashboard: log in as `admin@hirehub.com`.

> Backend runs on Render's free tier: it **sleeps after ~15 min idle**, so the first
> request after a nap takes ~30–50s to wake. The disk is **ephemeral** — accounts,
> messages, and uploads reset on every restart/redeploy; demo data re-seeds on boot.

## Features

- **Auth** — register / login with JWT + bcrypt password hashing.
- **Profiles** — headline, bio, location, avatar (uploaded image); edit your own.
- **Feed** — post text and/or attach documents (PDF, Word, txt, images), with real
  likes and comments (persisted; post owners can moderate replies on their posts).
- **Connections** — send/accept/decline invitations, withdraw or remove, connection
  counts on profiles, and suggestions that exclude anyone already in your graph.
- **Notifications** — a real inbox with unread badges, pushed live over Socket.io:
  likes, comments, invitations, acceptances, new applicants, status changes.
- **Jobs** — post jobs, search, view detail, apply with cover letter + résumé upload.
- **Applications** — track status (pending / reviewing / accepted / rejected); posters
  manage applicants per job.
- **Real-time chat** — Socket.io messaging with unread badges and typing indicator.
- **Document uploads** — stored on disk, served from `/uploads`.

## Stack

- **Backend**: Node + Express, Socket.io, SQLite via Node's built-in `node:sqlite`
  (no native build step), JWT, bcryptjs, multer.
- **Frontend**: React 18 + Vite, React Router, axios, socket.io-client.

## Requirements

- **Node.js 22.5+** (needs the built-in `node:sqlite` module; tested on Node 24).

## Run it locally

Open two terminals.

**1. Backend** (port 4000):

```bash
cd server
npm install
npm start        # or: npm run dev   (auto-restart on change)
```

**2. Frontend** (port 5173):

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173. Vite proxies `/api`, `/uploads`, and the WebSocket to the
backend, so no CORS or env config is needed for local dev.

### Try it

1. Register two accounts (use two browsers or one normal + one incognito).
2. Account A posts a job; Account B searches Jobs and applies with a résumé.
3. Account A opens the job, reviews the applicant, updates status, and messages them.
4. Watch the chat update live and the unread badge appear in the nav.
5. Post a document on the feed — it shows inline (images) or as a download card.

## Deployment (cloud)

Client on **Vercel**, backend on **Render** — both connected to this GitHub repo, so
**every push to `main` auto-redeploys both**. No local process needed.

**How requests flow in production:**

- Browser → Vercel. `/api/*` and `/uploads/*` are **rewritten** (proxied) to the
  Render backend by [`client/vercel.json`](client/vercel.json) — same-origin to the
  browser, so no CORS.
- Socket.io connects **directly** to Render via `VITE_SOCKET_URL` (a WebSocket upgrade
  can't be proxied through Vercel rewrites), so that var must be set on the client.
  Render's CORS allows the Vercel origin via `CLIENT_ORIGIN`.

**Render** (service `hire`, root dir `server`, `npm install` / `npm start`):

| Var             | Value                                        |
| --------------- | -------------------------------------------- |
| `CLIENT_ORIGIN` | `https://client-steel-eta-12.vercel.app`     |
| `DEMO_AUTH`     | `true`                                       |

**Vercel** (root dir `client`, framework Vite):

| Var               | Value                             |
| ----------------- | --------------------------------- |
| `VITE_SOCKET_URL` | `https://hire-95iz.onrender.com`  |

`client/vercel.json` rewrites already target `hire-95iz.onrender.com`. Step-by-step
first-time setup lives in [`DEPLOY.md`](DEPLOY.md).

## Configuration (all env vars)

Backend reads these (defaults shown):

| Var             | Default                        | Purpose                     |
| --------------- | ------------------------------ | --------------------------- |
| `PORT`          | `4000`                         | API + socket port           |
| `JWT_SECRET`    | `dev-secret-change-me-...`     | **change in production**    |
| `CLIENT_ORIGIN` | `http://localhost:5173`        | CORS / socket origin        |
| `DEMO_AUTH`     | `true`                         | any email+password logs in  |
| `ADMIN_EMAIL`   | `admin@hirehub.com`            | auto-promoted to admin      |
| `DB_PATH`       | `server/data.db`               | SQLite file location        |
| `UPLOAD_DIR`    | `server/uploads`               | uploaded files directory    |

Client (build-time, Vite):

| Var               | Default | Purpose                                             |
| ----------------- | ------- | --------------------------------------------------- |
| `VITE_SOCKET_URL` | `/`     | Socket.io origin in prod (direct to backend origin) |

## Project layout

```
server/
  src/
    index.js            Express app + Socket.io chat
    config.js  db.js  auth.js  messages-store.js
    routes/  auth users jobs applications posts messages upload
client/
  src/
    App.jsx  main.jsx  api.js  socket.js  util.js  index.css
    context/AuthContext.jsx
    components/  Navbar Avatar DocAttach
    pages/  Login Register Feed Jobs JobDetail Applications Messages Profile
```

## Notes / production hardening

Dev-grade as-is. Before shipping: set a real `JWT_SECRET`, put uploads on object
storage (S3) with virus scanning, add rate limiting, validate/scan file content,
serve the built frontend behind the API or a reverse proxy, and move to Postgres if
you need concurrency beyond SQLite.
