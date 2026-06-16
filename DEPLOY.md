# Deploying an AdonisJS app to Railway

This is a reusable recipe for deploying **any** AdonisJS application to
[Railway](https://railway.com) — not just this repo. It covers the web server,
a background **queue worker** (which also runs scheduled jobs), a SQL database
(Postgres **or** MySQL), and Redis.

This repo is itself a working reference: every change described in
[Part 1](#part-1--make-your-app-railway-ready) is already applied here, and it
uses [`@adonisjs/queue`](https://docs.adonisjs.com/guides/digging-deeper/queues)

- [`@adonisjs/redis`](https://docs.adonisjs.com/guides/database/redis) end to
  end.

> **Note on Railway variable names.** Railway exposes connection details on each
> database/Redis service as variables. The exact names (e.g. `DATABASE_URL`,
> `REDISHOST`) can vary by plugin version. Wherever this guide uses a reference
> like `${{Postgres.DATABASE_URL}}`, open that service's **Variables** tab and
> confirm the actual name before saving.

---

## Architecture

A typical deployment is **four services in one Railway project**, three of which
deploy from the same GitHub repo:

| Service  | Source        | Start command                  | Purpose                         |
| -------- | ------------- | ------------------------------ | ------------------------------- |
| `web`    | your repo     | `node build/bin/server.js`     | HTTP server (public domain)     |
| `worker` | your repo     | `node build/ace.js queue:work` | Background jobs **+ scheduler** |
| database | Railway image | —                              | Postgres or MySQL               |
| `redis`  | Railway image | —                              | Queue backend                   |

The `web` service's build/deploy config lives in [`railway.json`](./railway.json).
The `worker` deploys from the same repo with an overridden start command.

> The scheduler is **not** a separate service. `node ace queue:work` registers
> and executes scheduled jobs itself, so the worker covers both.

---

## Part 1 — Make your app Railway-ready

If you start from your own AdonisJS app, apply these changes (already present in
this repo):

1. **Bind to all interfaces.** Set `HOST=0.0.0.0` in production so the container
   is reachable. Railway provides `PORT`.

2. **Trust the proxy** so HTTPS detection, secure cookies, and client IPs are
   correct behind Railway's edge — `config/app.ts`:

   ```ts
   export const http = defineConfig({
     trustProxy: () => true,
     // ...
   })
   ```

3. **Read the database from a connection string** — `config/database.ts` uses
   `DB_CONNECTION` to pick `postgres` (via `DATABASE_URL`) or `mysql` (via
   `MYSQL_URL`). Install the driver(s) you need: `npm i pg` and/or `npm i mysql2`.

4. **Add a health check** — a lightweight route Railway can gate deploys on:

   ```ts
   router.get('/health', ({ response }) => response.ok({ status: 'ok' }))
   ```

5. **Pin Node** — add a `.node-version` file (this repo pins `24`) for
   reproducible Railpack builds.

6. **Commit `railway.json`** — see below.

7. **Validate the new env vars** in `start/env.ts` (`DB_CONNECTION`,
   `DATABASE_URL`/`MYSQL_URL`, and — if you use the queue — `QUEUE_DRIVER`,
   `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`).

### `railway.json` (the web service)

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "node ace build"
  },
  "deploy": {
    "preDeployCommand": "node build/ace.js migration:run --force",
    "startCommand": "node build/bin/server.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 120,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- **`buildCommand`** compiles to `./build` (AdonisJS production build).
- **`preDeployCommand`** runs pending migrations before the new version takes
  traffic. It is idempotent and Lucid takes a lock, so it is safe.
- **`startCommand`** runs the compiled server.

---

## Part 2 — Create the project and database

1. **New Project → Deploy from GitHub repo**, and select your repo. Railway
   detects `railway.json` and builds with Railpack.
2. **Add the database**: in the project, **+ New → Database → Add PostgreSQL**
   (or **MySQL**). This creates a managed database service.

---

## Part 3 — Add Redis (queue backend)

**+ New → Database → Add Redis.** This repo's queue uses the `redis` driver
(`QUEUE_DRIVER=redis`) over the `main` Redis connection.

> Prefer the **private network**: Railway databases are reachable at
> `*.railway.internal` with no egress cost and no TLS required.

---

## Part 4 — Environment variables

Set these on the **`web`** service. The `worker` needs the same database, Redis,
and app secrets — use Railway **shared variables** (project/environment level) to
avoid duplicating them, or copy them onto the worker.

| Variable         | Value                                | Notes                                                                                          |
| ---------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `APP_KEY`        | _(generate — see below)_             | **Required.** Same value across all environments you want to share signed/encrypted data with. |
| `HOST`           | `0.0.0.0`                            | Bind all interfaces.                                                                           |
| `PORT`           | _(provided by Railway)_              | Do not hardcode.                                                                               |
| `NODE_ENV`       | `production`                         |                                                                                                |
| `LOG_LEVEL`      | `info`                               |                                                                                                |
| `TZ`             | `UTC`                                |                                                                                                |
| `APP_URL`        | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Tracks the generated/custom domain.                                                            |
| `SESSION_DRIVER` | `cookie`                             | Stateless; works across replicas.                                                              |
| `DB_CONNECTION`  | `postgres` **or** `mysql`            | Must match the database you added.                                                             |
| `DATABASE_URL`   | `${{Postgres.DATABASE_URL}}`         | Postgres only. Confirm the var name.                                                           |
| `MYSQL_URL`      | `${{MySQL.MYSQL_URL}}`               | MySQL only. Confirm the var name.                                                              |
| `QUEUE_DRIVER`   | `redis`                              |                                                                                                |
| `REDIS_HOST`     | `${{Redis.REDISHOST}}`               | Confirm the var name in the Redis service.                                                     |
| `REDIS_PORT`     | `${{Redis.REDISPORT}}`               | Confirm the var name.                                                                          |
| `REDIS_PASSWORD` | `${{Redis.REDISPASSWORD}}`           | Confirm the var name.                                                                          |

### Generating `APP_KEY`

```bash
node ace generate:key
```

Paste the value into `APP_KEY`. Keep it stable across deploys (signed cookies,
sessions, and encrypted values depend on it). To mirror the app to another
environment, reuse the **same** key.

---

## Part 5 — Add the worker service

1. **+ New → GitHub Repo**, select the **same** repo again. This creates a second
   service from the same code.
2. In the worker's **Settings → Deploy**, set a **Custom Start Command**:
   ```
   node build/ace.js queue:work
   ```
3. Give it the database, Redis, and app variables (shared variables make this
   one step).
4. The worker needs **no** public domain and **no** health check.

> **Migrations on the worker.** Because both services share `railway.json`, the
> `preDeployCommand` migration also runs on the worker. That is safe (idempotent
>
> - locked). To run migrations on the `web` service only, give the worker its own
>   config file: Settings → **Config-as-code** path → e.g. `/railway.worker.json`
>   (a copy of `railway.json` without `preDeployCommand`).

---

## Part 6 — Domain and go live

On the `web` service: **Settings → Networking → Generate Domain** (or attach a
custom domain). Because `APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}`, the app URL
tracks it automatically.

Push to your default branch (or click **Deploy**). Railway will: build → run
migrations (pre-deploy) → start the server → health-check `/health` → route
traffic.

---

## Local development

```bash
cp .env.example .env
node ace generate:key   # writes APP_KEY
# set DATABASE_URL (Postgres) or MYSQL_URL (MySQL)
npm run dev
```

`QUEUE_DRIVER=sync` (the local default) runs jobs inline, so you do not need
Redis or a worker process while developing. Switch to `redis` to exercise the
real worker.

---

## Scaling notes

- **Web**: scale horizontally; `SESSION_DRIVER=cookie` is stateless.
- **Worker**: increase `config/queue.ts` `worker.concurrency`, or add replicas.
  Redis-backed scheduled jobs are de-duplicated, so multiple workers are safe.
- **Database/Redis**: connect over the private network (`*.railway.internal`).
