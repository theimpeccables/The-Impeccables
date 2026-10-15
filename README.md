# The Impeccables

The Impeccables is the public website and member operations platform for a multidisciplinary cultural society. It combines the React website with a permission-checked API for member accounts, content publishing, events, tasks, volunteering, attendance, notifications, and administration.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Redux Toolkit, Tailwind CSS 4 |
| API | Node.js 22+, Express 5 |
| Persistence | MongoDB and Mongoose 8 |
| Authentication | bcryptjs, JWT access tokens, rotating refresh sessions in httpOnly cookies |
| Media | Cloudinary image/video uploads |
| Email | Nodemailer over configurable SMTP |
| Background work | Optional Redis, BullMQ, and node-cron (Asia/Kolkata schedules) |
| UI/3D | Lucide icons and Three.js |

## Repository map

```text
backend/                  Express API, Mongoose models, seed script, tests
frontend/                 React site and member/admin dashboard
docs/implementation-roadmap.md
scripts/dev.js            Runs frontend and API together
.env.example              Combined variable reference
backend/.env.example      API environment template
frontend/.env.example     Browser-safe Vite configuration
```

## Requirements and setup

- Node.js 22 or newer and npm
- MongoDB local instance or Atlas URI
- Cloudinary account for member media uploads
- Brevo account with transactional email enabled, an authenticated sender/domain, and an SMTP key for password recovery and email notifications
- Redis/Upstash URL for queued and scheduled background work (optional for basic local development)

Install each app's dependencies from the repository root:

```sh
npm ci --prefix frontend
npm ci --prefix backend
```

Create local environment files from the templates:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

In `backend/.env`, set `MONGODB_URI`, independent random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values (at least 32 characters each for production), and `CORS_ORIGINS`. Add Cloudinary credentials for uploads. Brevo's sample SMTP settings are `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, and `SMTP_SECURE=false`. Copy the **SMTP login** shown in Brevo to `SMTP_USER`, the generated **SMTP key** (not the API key) to `SMTP_PASS`, and a verified sender address to `EMAIL_FROM`. Set `CONTACT_EMAIL` to the inbox that should receive contact-form messages. Set `REDIS_URL` to enable queued messages and scheduled jobs. Keep these real values in local/deployment secret stores only. Never put credentials in `frontend/.env.local`; Vite variables are public in the browser bundle.

`frontend/.env.local` normally only needs `VITE_API_URL=http://localhost:5001/api`. The backend defaults to port 5001 because macOS ControlCenter may already occupy port 5000; the frontend defaults to port 5173.

## Run locally

```sh
npm run dev
```

The frontend is available at `http://localhost:5173`; the API is at `http://localhost:5001/api`. Stop both with Ctrl+C. To run either service separately, use `npm run dev:frontend` or `npm run dev:backend`.

Once MongoDB is configured, seed the role/permission catalog, seven creative domains, current club session, and optionally the first Super Admin:

```sh
npm --prefix backend run seed
```

To bootstrap a Super Admin, set `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in `backend/.env` before running the explicit seed command. Use a unique password of at least 12 characters. The seed command will not disclose the password or reset an existing account password.

Member Management search waits 300 ms after typing before requesting results. Search is case-insensitive and matches name or email prefixes; the member-search index command backfills normalized name fields and creates the supporting MongoDB indexes. After deploying this search update, run `npm --prefix backend run index:member-search` once against the target database to apply the backfill and indexes. The regular seed command performs the same backfill.

For local QA, set `TEST_ACCOUNT_PASSWORD` in `backend/.env` to a unique password of at least 12 characters, then run `npm --prefix backend run seed:test-accounts`. This creates 16 repeatable accounts: a Member and Domain Admin for each of the seven seeded domains, plus Club Admin and Super Admin accounts. The script prints the email roster; all accounts use the password you set. These reserved `.test` addresses are for local testing and do not receive email. Re-running this explicit command resets these QA accounts to `TEST_ACCOUNT_PASSWORD`.

## Implemented product areas

- Public pages for domains, gallery, events, announcements, achievements, public team profiles, and contact submissions use API data with loading/error/empty states.
- Authentication supports admin-provisioned accounts, login, refresh, logout, password reset/change, member profile management, roles, permission checks, and domain-scoped authorization.
- Member search is debounced on the client and uses normalized, indexed name prefixes and the existing email index.
- Members can draft and submit content; reviewers can use scoped approval queues with revision history, multi-review requirements, self-review rules, moderation, and Cloudinary media.
- Task assignment and status workflows, workload-aware allocation, event volunteer shifts, capacity/conflict checks, and event rosters are backed by MongoDB.
- Meeting records, bulk attendance endpoints, individual attendance history, and absence explanation review are backed by MongoDB.
- In-app notifications, announcement delivery preferences, tracked email, audit logs, reports, system settings, and admin dashboards are available.
- If Redis is configured, BullMQ runs retryable email jobs and scheduled birthday, event reminder, task deadline, stale approval, and weekly report jobs. Without Redis, queued jobs are disabled; direct SMTP delivery remains available.

API liveness is `GET /api/health`, database readiness is `GET /api/health/ready`, automation status is `GET /api/health/jobs`, and the public XML sitemap is `GET /api/sitemap.xml`. `frontend/public/robots.txt` disallows crawler indexing of `/dashboard/`.

## Quality checks

Run from the root:

```sh
npm run lint
npm test
npm run build
```

The GitHub Actions workflow runs these checks on pushes and pull requests. Tests cover the API health/404 contract and core role/permission/domain-scope behavior. Database-backed integration checks require a configured MongoDB instance; SMTP, Cloudinary, and Redis workflows require their provider configuration.

## Deployment

### Frontend on Vercel

- Import the repository and set the project root to `frontend`.
- Build command: `npm run build`; output directory: `dist`.
- In Vercel Project Settings → Environment Variables, set `VITE_API_URL=/api` for Production (and Preview if you use preview deployments). This sends API calls through the included Vercel rewrite to `https://the-impeccables-2.onrender.com/api` while keeping the browser request on your Vercel site origin.
- The included `frontend/vercel.json` proxies `/api/*` to Render and then sends other paths to the React app for client-side routing. Keep the API rewrite before the SPA fallback.
- After the first Vercel deployment, copy its exact Production URL (for example, `https://your-project.vercel.app`) into Render's `FRONTEND_URL` and `CORS_ORIGINS`. Use the production URL only; add a Preview URL to `CORS_ORIGINS` only when you need authenticated preview testing. Do not use `*`.

### API on Render

- Create a Render **Web Service** from the GitHub repository. Set the branch to `main` and root directory to `backend`.
- Build command: `npm ci`; start command: `npm run start:production`. The regular `npm start` command watches source files for local development; use the production command on hosts.
- Set the health check path to `/api/health/ready`. Render provides `PORT` to the web service; the API reads it automatically.
- Set `NODE_ENV=production`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`, `MONGODB_URI`, two distinct JWT secrets, `FRONTEND_URL`, and `CORS_ORIGINS`. Add Cloudinary and SMTP variables as secrets. Add `REDIS_URL` only if you provision Redis.
- The root `render.yaml` is an optional Blueprint for this API service. It pins Node 22 and defines the build/start commands and health check; secret values are entered in the Render environment settings.
- Choose a paid web service plan for a production API that should stay warm. Render's Free web services spin down after 15 minutes without inbound traffic and can take about a minute to wake up.
- Run the seed command once against production to initialize reference data and the initial Super Admin, not on every server start. Keep bootstrap Super Admin variables limited to that one-off run.

For the current `*.vercel.app` frontend and `*.onrender.com` backend, keep `COOKIE_SAME_SITE=lax` and `COOKIE_SECURE=true`. The Vercel rewrite makes browser API requests same-origin, so the refresh cookie can be used without relying on cross-site cookies. If you later remove the proxy and call Render directly, use custom sibling domains such as `www.example.com` and `api.example.com` for reliable cookie authentication; set `VITE_API_URL=https://api.example.com/api` in that setup.

Keep the current development MongoDB URI in local `backend/.env`. Create a separate production database in MongoDB Atlas and set only Render's `MONGODB_URI` to that URI. Run the explicit seed command against production once to create reference data and the initial Super Admin. Do not run the test-account seed on production.

Render production variables: `NODE_ENV=production`, `MONGODB_URI` (your separate production database), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`, `FRONTEND_URL` (the exact Vercel Production URL), `CORS_ORIGINS` (the same exact URL, comma-separated only if allowing additional origins), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, and `CONTACT_EMAIL`. Set `MAX_UPLOAD_BYTES=52428800`; Render supplies `PORT`. Add `REDIS_URL` only if you provision Redis. Generate two distinct random JWT secrets (at least 32 characters). Keep bootstrap admin variables out of regular runtime settings; supply them only when running the initial seed. `VITE_API_URL` belongs in Vercel, not Render.

Before launch, verify cookie behavior across the chosen frontend/API hostnames, CORS origins, SMTP sender verification, MongoDB backups/restore, Cloudinary quotas, and Redis persistence. Take regular MongoDB Atlas backups and periodically verify restoration in a separate database. Keep production credentials in the hosting provider's secret manager and rotate them through deployment settings.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run frontend and API together |
| `npm run dev:frontend` | Run Vite only |
| `npm run dev:backend` | Run Express with Node watch mode |
| `npm run lint` | Lint frontend and backend source |
| `npm test` | Run backend tests |
| `npm run build` | Build the frontend for production |
| `npm run start:backend` | Start the API in production mode |
| `npm --prefix backend run seed` | Explicitly seed roles/domains and optional initial Super Admin |
| `npm --prefix backend run seed:test-accounts` | Create/reset local QA accounts for every role and domain |
| `npm --prefix backend run index:member-search` | Backfill normalized name fields and create member search indexes |

For the ordered implementation details and any environment-dependent handover steps, see [the implementation roadmap](docs/implementation-roadmap.md).
