# Deployment Guide — Backend (Render + Render Postgres)

This is an Express + `socket.io` app (entry point `server.js`) using `pg` to
talk to PostgreSQL. It's deployed as a Render **Web Service**, backed by a
Render **Postgres** instance (any managed Postgres works, since the app talks
to it via discrete host/port/user/password/db env vars, not a hardcoded
connection string — see `src/configs/database.js`).

## 0. Branch note

The code currently pushed to GitHub is on the `install-packages` branch
(`origin/install-packages`), not `main`. **Recommendation:** merge
`install-packages` into `main` before connecting Render, so production always
deploys from `main` and `install-packages` doesn't become a de facto
production branch by accident. This is a recommendation only — no branches
were merged as part of this deployment-readiness pass; decide and merge
yourself, then when creating the Render service either point it at `main` (if
merged) or explicitly select `install-packages` as the deploy branch (if not).

## 1. Create the Web Service on Render

1. Render dashboard -> **New -> Web Service**.
2. Connect the GitHub repo `dnobleza/codehaus-chatFlow`.
3. Branch: `main` (if merged per the note above) or `install-packages`
   (if deploying as-is for now).
4. Environment: **Node**.
5. Build command: `npm install`
6. Start command: `node server.js` (equivalently `npm start`, which runs the
   same thing per `package.json`).
7. Instance type: Free/Starter is fine to begin with; socket.io connections
   are long-lived, so watch for Render's free-tier idle/spin-down behavior if
   you land on the free plan — it will disconnect idle sockets and cause a
   cold-start delay on the next request.

## 2. Provision Postgres

1. Render dashboard -> **New -> PostgreSQL**.
2. Once created, open the instance's **Info** page. Render exposes connection
   details as discrete fields (not just a single connection string):
   `Hostname`, `Port`, `Database`, `Username`, `Password`.
3. No code changes are needed — `src/configs/database.js` already builds its
   `pg.Pool` from discrete `DB_HOST`/`DB_PORT`/`DB_USER`/`DB_PASSWORD`/
   `DB_NAME` env vars, which map directly to those fields.
4. Prefer the **Internal Database URL / internal host** if your Web Service
   and Postgres instance are in the same Render region — internal
   connections don't require TLS. If you instead use the **External**
   host/port (e.g. connecting from outside Render, or the service and DB end
   up in different regions), Render's Postgres requires SSL for external
   connections; `src/configs/database.js` does not currently pass an `ssl`
   option to `pg.Pool`, so an external connection would fail with something
   like `no pg_hba.conf entry` / SSL-related connection errors. This wasn't
   changed here since same-region internal connections are the standard
   setup and require no code change — flagging it so it's a known first
   troubleshooting step if DB connectivity fails after deploy.

## 3. Environment variables (Render Web Service -> Environment)

| Variable | Value | Notes |
|---|---|---|
| `DB_HOST` | from Postgres instance's Hostname | |
| `DB_PORT` | from Postgres instance's Port (usually `5432`) | |
| `DB_USER` | from Postgres instance's Username | |
| `DB_PASSWORD` | from Postgres instance's Password | |
| `DB_NAME` | from Postgres instance's Database name | |
| `JWT_SECRET` | generate a new strong secret | **Do not reuse** the local dev secret in `.env` — generate fresh, e.g. `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | e.g. `7d` | matches local dev default in `src/configs/env.js` if unset, but set explicitly for clarity |
| `FRONTEND_URL` | the deployed Vercel URL, e.g. `https://chatflow-codehaus.vercel.app` | Used for **both** REST CORS (`app.js`) and socket.io CORS (`server.js`) — see fix below |

`PORT` does **not** need to be set manually — `src/configs/env.js` already
reads `process.env.PORT` with a `3000` fallback, and Render injects its own
`PORT` value at runtime that the app will pick up automatically.

### Chicken-and-egg with the frontend

`FRONTEND_URL` needs the frontend's real Vercel URL, but you likely won't
know that until the Vercel project exists. Suggested order:

1. Deploy the backend first with a placeholder `FRONTEND_URL` (or your
   best-guess Vercel URL, e.g. `https://<project-name>.vercel.app` — Vercel
   project URLs are often predictable from the project name).
2. Deploy the frontend on Vercel (see its `DEPLOYMENT.md`), note the actual
   URL.
3. Update `FRONTEND_URL` here to match exactly (including `https://`, no
   trailing slash), and **redeploy** the backend so the running process picks
   up the new env var (Render restarts the service on env var changes, but
   confirm via the dashboard/logs).

## 4. CORS fix applied in this pass

`server.js` previously configured socket.io with wildcard CORS
(`{ cors: { origin: '*' } }`), inconsistent with the REST API's CORS in
`app.js`, which already locks down to `FRONTEND_URL`. Since the socket
connection carries a JWT (`socket.handshake.auth.token`, see
`src/configs/socket.js`), wildcard CORS on it is unnecessary exposure in
production. Fixed to use the same `frontendUrl` config value:

```diff
- const { port } = require('./src/configs/env');
+ const { port, frontendUrl } = require('./src/configs/env');
  ...
- const io = new Server(httpServer, { cors: { origin: '*' } });
+ const io = new Server(httpServer, {
+   cors: { origin: frontendUrl, credentials: true },
+ });
```

`frontendUrl` already defaults to `http://localhost:3001` (see
`src/configs/env.js`) when `FRONTEND_URL` is unset, matching the frontend's
CRA dev server port — local dev behavior is unchanged; only production
(where `FRONTEND_URL` should be explicitly set to the Vercel URL) is
affected.

## 5. Database schema

**No SQL schema/migration file currently exists in this repo.** Locally, the
`users` and `messages` tables were assumed to pre-exist rather than being
created via a tracked migration. On a fresh Render Postgres instance, these
tables do not exist and must be created before the app can function (the
first `register` call will fail with a `relation "users" does not exist`
error otherwise).

You'll need to either:
- Recreate the tables manually via Render's Postgres **Shell**/`psql`, or
  a GUI client (e.g. `psql`, TablePlus, DBeaver) pointed at the new instance, or
- Confirm/adjust and run a schema script (see draft below), or
- Export the schema from your local `chatflow` database (`pg_dump --schema-only`)
  and apply it here, if you want to guarantee an exact match to local dev.

### Draft schema (inferred from controller queries — review before running)

This is inferred only from the columns actually referenced in
`src/controllers/auth.controller.js`, `src/controllers/message.controller.js`,
`src/controllers/user.controller.js`, and `src/configs/socket.js`. It is a
starting point, not a guaranteed match to whatever constraints exist on your
local `chatflow` database (e.g. local `users.email`/`users.username` may or
may not already have `UNIQUE` constraints at the DB level — the app currently
only checks uniqueness in application code for `email`, via a `SELECT` before
`INSERT`). **Confirm against your local DB schema before running this
anywhere**, and treat `UNIQUE`/`NOT NULL` choices below as suggestions, not
verified fact:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_sender_receiver ON messages (sender_id, receiver_id);
CREATE INDEX idx_messages_receiver_sender ON messages (receiver_id, sender_id);
```

This file intentionally does **not** ship as a committed migration — it's a
draft for you to review/confirm (or correct) before it's added to the repo
and run against production. See the accompanying report for the explicit
question on whether to commit this as a tracked migration file.

## 6. Deploy & verify

1. Trigger the Render deploy (automatic on push, once connected).
2. Check build logs: `npm install` succeeds.
3. Check runtime logs for:
   - `[SERVER] Connected to the database successfully.` (confirms DB env vars
     are correct and reachable)
   - `[SERVER] Server is running on port <PORT>` (Render's injected port)
4. Hit the root URL (`GET /` -> `"Hello, World!"` from `app.js`) as a basic
   health check — there is no dedicated `/health` route in this app; this
   root route is the closest existing equivalent. Consider adding a real
   `/health` endpoint later if you want Render's health checks decoupled from
   the app's default route.
5. From the deployed frontend, confirm:
   - Register/login works (REST + DB + CORS all correct).
   - Realtime messaging works (socket.io CORS correct, JWT auth on socket
     handshake correct).

## 7. Manual steps only you can perform

Everything in this document assumes dashboard access this environment does
not have. You will need to:

- Create/log into the Render account.
- Connect the GitHub repo (`dnobleza/codehaus-chatFlow`) and authorize Render's
  GitHub App/OAuth access.
- Decide on and perform the `install-packages` -> `main` merge (or not).
- Create the Web Service and the Postgres instance in the Render dashboard.
- Enter all env vars listed in section 3 into Render's dashboard.
- Run the schema setup in section 5 against the new Postgres instance (via
  Render's Postgres shell or an external client).
- Once the frontend's Vercel URL is known, update `FRONTEND_URL` here and
  redeploy.
