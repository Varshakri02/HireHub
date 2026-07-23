# HireHub — LinkedIn-style Job & Networking App

Full-stack job platform: profiles, a document feed, job posting + applications, and
real-time chat.

## Features

- **Auth** — register / login with JWT + bcrypt password hashing.
- **Profiles** — headline, bio, location, avatar (uploaded image); edit your own.
- **Feed** — post text and/or attach documents (PDF, Word, txt, images).
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

## Run it

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

## Configuration (optional env vars)

Backend reads these (defaults shown):

| Var             | Default                        | Purpose                     |
| --------------- | ------------------------------ | --------------------------- |
| `PORT`          | `4000`                         | API + socket port           |
| `JWT_SECRET`    | `dev-secret-change-me-...`     | **change in production**    |
| `CLIENT_ORIGIN` | `http://localhost:5173`        | CORS / socket origin        |
| `DB_PATH`       | `server/data.db`               | SQLite file location        |
| `UPLOAD_DIR`    | `server/uploads`               | uploaded files directory    |

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
