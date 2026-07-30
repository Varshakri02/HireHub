# Deploy HireHub (backend → Render, client → Vercel)

Both run in the cloud — no local process needed once deployed.

**Free-tier caveats (Render):** backend sleeps after ~15 min idle (first request
after sleep takes ~50s to wake), and the disk is ephemeral — accounts, messages
and uploaded files reset on every restart/redeploy. Demo data is re-seeded on boot.

Repo: https://github.com/Varshakri02/HireHub

---

## 1. Backend on Render

1. Push this branch to GitHub (see bottom).
2. Go to https://dashboard.render.com → **New → Web Service** → connect the
   `Varshakri02/HireHub` repo.
3. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
   - Node 24 is picked up automatically from `server/.node-version`.
4. Environment variables:
   - `DEMO_AUTH` = `true`
   - `CLIENT_ORIGIN` = *(fill in after step 2 of Vercel — your `https://...vercel.app` URL)*
5. Create the service. Note the URL, e.g. `https://hirehub-api.onrender.com`.
6. Test: open `https://<your-render-url>/api/health` → should show `{"ok":true}`.

> `render.yaml` at the repo root also works as a Render **Blueprint** if you
> prefer New → Blueprint instead of the manual steps above.

---

## 2. Client on Vercel

1. Edit **`client/vercel.json`** — replace both `REPLACE-WITH-RENDER-URL.onrender.com`
   occurrences with your real Render host (no `https://`, no trailing slash — just
   the host, e.g. `hirehub-api.onrender.com`). Commit + push.
2. Go to https://vercel.com → **Add New → Project** → import `Varshakri02/HireHub`.
3. Settings:
   - **Root Directory:** `client`
   - Framework preset: **Vite** (auto-detected). Build `vite build`, output `dist`.
4. Environment variable:
   - `VITE_SOCKET_URL` = `https://<your-render-url>` (full origin, with `https://`)
5. Deploy. Note the `https://<project>.vercel.app` URL.

---

## 3. Link them

1. Back in Render → the service → Environment → set `CLIENT_ORIGIN` to the Vercel
   URL (e.g. `https://hirehub.vercel.app`). Save → it redeploys.
2. Open the Vercel URL. Log in with any email + password (demo auth).
   Admin dashboard: log in as `admin@hirehub.com`.

## How requests flow in production

- Browser → Vercel. `/api/*` and `/uploads/*` are **rewritten** (proxied) by
  `client/vercel.json` to the Render backend — same-origin to the browser, so no CORS.
- Socket.io connects **directly** to Render via `VITE_SOCKET_URL` (WebSocket
  upgrade can't be proxied through Vercel rewrites). Render CORS allows the
  Vercel origin via `CLIENT_ORIGIN`.
