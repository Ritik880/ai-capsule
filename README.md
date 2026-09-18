# AI Capsule

A small full-stack CRUD app for saving and managing AI prompts. Built for CSE3CWA/CSE5006
Assignment 3 — React frontend, Node/Express backend, SQLite storage, GitHub OAuth login,
and an application JWT issued by Express and stored in an HttpOnly cookie.

## 1. Deployed URL

- **Public URL:** https://ai-capsule-fxr7.onrender.com
- **Cloud platform:** Render (free web service)

## 2. Install & run locally

Requires Node.js 18+.

```bash
# Backend
cd backend
npm install
cp .env.example .env   # then fill in real values, see section 5
npm run dev             # runs on http://localhost:3001

# Frontend (separate terminal)
cd frontend
npm install
npm run dev             # runs on http://localhost:5173
```

In local development, the React app runs on `:5173` and calls the Express API on `:3001`
(CORS is configured for this). Visit `http://localhost:5173`.

### Production build (single-service)

In production, Express serves the built React app itself from the same origin as the API,
so there is no cross-origin cookie/CORS configuration to worry about:

```bash
cd frontend && npm install && npm run build   # outputs frontend/dist
cd ../backend && npm install
NODE_ENV=production npm start                  # serves frontend/dist AND the API on one port
```

## 3. API routes

| Route | Access | Purpose |
|---|---|---|
| `GET /api/health` | Public | Returns `{ "status": "ok" }` |
| `GET /api/capsules` | Protected | List the authenticated user's capsules |
| `POST /api/capsules` | Protected | Create a capsule owned by the authenticated user |
| `PUT /api/capsules/:id` | Protected | Update a capsule the authenticated user owns |
| `DELETE /api/capsules/:id` | Protected | Delete a capsule the authenticated user owns |
| `GET /auth/github` | Public | Starts the GitHub OAuth flow |
| `GET /auth/github/callback` | Public | GitHub redirects here with the auth code; issues the app JWT |
| `GET /auth/me` | Protected | Returns the current user, decoded from the JWT |
| `POST /auth/logout` | Public | Clears the `token` cookie |

The React frontend talks to Express via `axios`, with `withCredentials: true` so the
`token` cookie is sent on every request. In dev the frontend calls
`http://localhost:3001`; in production it calls relative paths (`/api/...`, `/auth/...`)
since both are served from the same origin (see `frontend/src/lib/api.js`).

## 4. Authentication (OAuth + JWT)

- **Provider:** GitHub OAuth (Authorization Code flow), implemented manually in
  `backend/auth.js` — no Passport.js.
- **Flow:** `GET /auth/github` redirects to GitHub's authorize page → GitHub redirects
  back to `GET /auth/github/callback` with a `code` → the backend exchanges that code for
  a GitHub access token → fetches the GitHub profile → **signs its own application JWT**
  (payload: GitHub user id, username, name, avatar URL) with `jsonwebtoken` → sets it in a
  cookie named `token` (`HttpOnly`, `Secure` in production, `SameSite=Lax`, 7-day expiry) →
  redirects the browser to `/dashboard`.
- **Verification:** `backend/authMiddleware.js` reads the `token` cookie and verifies it
  with `jwt.verify(token, JWT_SECRET)` on every protected route. Missing or invalid tokens
  return `401 Unauthorized`.
- **Ownership:** every `/api/capsules` route uses `req.user.id` (from the verified JWT) as
  the `user_id` — never a value supplied by the client. `PUT`/`DELETE` additionally filter
  by `WHERE id = ? AND user_id = ?`, so a user cannot modify or delete another user's
  record.
- The GitHub OAuth access token itself is discarded after use — it is not the session.

## 5. Environment variables

Set these in `backend/.env` locally, and in the Render dashboard for the deployed service
(see `backend/.env.example` for the template — no real values are committed).

| Variable | Purpose |
|---|---|
| `PORT` | Port Express listens on |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Signs/verifies the application JWT |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `BACKEND_URL` | Public URL of this backend (used to build the OAuth callback URL) |
| `FRONTEND_URL` | Public URL of the frontend (used for the CORS origin and post-login redirect) |

No secret values are committed to the repository; `.env` is in `.gitignore`.

## 6. Database & storage

- SQLite via `better-sqlite3`, single table `capsules` (schema in `backend/db.js`),
  created automatically on first run if it doesn't exist.
- Every row has a `user_id` column holding the GitHub user ID from the verified JWT —
  this is how records are scoped to their owner.
- **Persistence:** Ephemeral. This deployment uses Render's free web service with no
  persistent disk attached, so the SQLite file (`capsules.db`) lives on the container's
  local filesystem and is reset whenever the service restarts or redeploys. Capsule data
  does not survive across deploys. See section 8 for how this is documented as a
  limitation.

## 7. Required cURL tests

Run against the deployed backend before submission:

```bash
# Test 1 — no authentication
curl -i https://ai-capsule-fxr7.onrender.com/api/capsules
# Required: 401 Unauthorized

# Test 2 — fake / invalid JWT
curl -i -H "Cookie: token=fake-token-123" https://ai-capsule-fxr7.onrender.com/api/capsules
# Required: 401 Unauthorized
```

**Results (deployed, confirmed working):**
- Test 1 → `HTTP/2 401` with body `{"error":"Unauthorized"}` ✅
- Test 2 → `HTTP/2 401` with body `{"error":"Unauthorized"}` ✅
- `GET /api/health` → `{"status":"ok"}` ✅

**Results (local, confirmed working during development):**
- Test 1 → `HTTP/1.1 401 Unauthorized` ✅
- Test 2 → `HTTP/1.1 401 Unauthorized` ✅
- `GET /api/health` → `{"status":"ok"}` ✅

## 8. Known limitation

SQLite storage on this deployment is not persistent: Render's free web service tier has
no attached disk, so `capsules.db` lives on the container's ephemeral local filesystem and
is wiped on every restart or redeploy. This is acceptable for demonstrating the required
CRUD/OAuth/JWT behaviour but would need a Render persistent disk or an external database
(e.g. Render PostgreSQL) for real production use.

## 9. AI-assisted development statement

- **AI tools used:** Claude (Claude Code).
- **Problems found and corrected:**
  1. The local backend process had loaded stale environment variables from before `.env`
     was updated with the real `GITHUB_CLIENT_ID` (env vars are only read at process
     startup) — the `/auth/github` redirect sent the literal placeholder string
     `your_github_client_id` to GitHub, causing a 404. Fixed by restarting the process.
  2. On Render, the web service's Build/Start commands defaulted to `yarn` (with no
     root-level `package.json`), so the app never actually installed dependencies, built
     the frontend, or started Express — causing a crash loop and `502` responses. Fixed by
     setting explicit Build/Start commands (`npm install`/`npm run build` per workspace,
     `npm start --prefix backend`).
  3. With `NODE_ENV=production` set, `npm install --prefix frontend` skipped
     `devDependencies` (including `vite`), so `npm run build` failed with
     `vite: not found`. Fixed by forcing `--include=dev` on that specific install step,
     since the frontend build tooling is needed at build time regardless of `NODE_ENV`.
  4. The production GitHub OAuth app's callback URL edit hadn't actually been saved
     (GitHub requires clicking "Update application" separately from generating a secret),
     causing a "redirect_uri is not associated with this application" error; and a
     mismatched `GITHUB_CLIENT_SECRET` value caused GitHub's token exchange to fail with
     `incorrect_client_credentials`. Both were caught by reading the server's own log
     output (`console.error` in the OAuth callback) rather than guessing.
- **How OAuth/JWT/protected-API behaviour was verified:** manually via GitHub login in the
  browser on the deployed URL, checking the `token` cookie in DevTools (HttpOnly, correct
  name), and running the two required `curl` commands above against the deployed URL to
  confirm `401` on missing/invalid tokens.
- **How CRUD and ownership were verified:** manually created, edited, and deleted capsules
  through the deployed dashboard UI while logged in with a GitHub account; confirmed
  `PUT`/`DELETE` use `WHERE user_id = ?` in `backend/capsules.js` by code inspection.
- **One implementation/deployment decision:** the frontend and backend are deployed as a
  single Render web service (Express serves the built React app from `frontend/dist`),
  rather than as two separate services, specifically to avoid cross-origin cookie and CORS
  configuration for the `token` cookie — the frontend's API calls become relative paths in
  production so everything shares one origin.
