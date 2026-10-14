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
- Set `VITE_API_URL` to the deployed API's `/api` URL.
- Configure SPA rewrites so nested React Router paths serve `index.html`.
- Add the Vercel production and preview origins to the backend `CORS_ORIGINS` allowlist.

### API on Railway

- Create a Railway service from the GitHub repository with root directory `/backend`.
- Install command: `npm ci`; start command: `npm run start:production`. The regular `npm start` command watches source files for local development; use the production command on hosts.
- Set `NODE_ENV=production`, `PORT` if required by the host, `MONGODB_URI`, both JWT secrets, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=lax`, `FRONTEND_URL`, and explicit `CORS_ORIGINS`.
- Add Cloudinary and SMTP variables as deployment secrets. Add `REDIS_URL` only when a Redis service is provisioned.
- Configure a health check at `/api/health/ready`. The API shuts down its database and queue connections on termination.
- Run the seed command once as a release/setup step, not on each server start. Restrict the initial Super Admin bootstrap variables to that setup run.

For browser authentication, use a custom domain with sibling subdomains such as `www.example.com` for Vercel and `api.example.com` for Railway. Set `COOKIE_SAME_SITE=lax`, `COOKIE_SECURE=true`, and set `FRONTEND_URL` and `CORS_ORIGINS` to the exact Vercel production origin. The frontend and API must use HTTPS. The Vercel project uses `frontend/` as its root directory, `npm run build` as its build command, `dist` as its output directory, and `VITE_API_URL=https://api.example.com/api`. The included `frontend/vercel.json` sends client-side routes to the React app.

Keep the current development MongoDB URI in local `backend/.env`. Create a separate production database in MongoDB Atlas and set only the Railway service's `MONGODB_URI` to that URI. Run the explicit seed command against production once to create reference data and the initial Super Admin. Do not run the test-account seed on production.

Railway production variables: `NODE_ENV`, `PORT` (Railway supplies this), `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `JWT_ISSUER`, `JWT_AUDIENCE`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `FRONTEND_URL`, `CORS_ORIGINS`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `MAX_UPLOAD_BYTES`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, and `CONTACT_EMAIL`. Add `REDIS_URL` only if you provision Redis. Generate two distinct random JWT secrets (at least 32 characters). Keep bootstrap admin variables out of regular runtime settings; supply them only when running the initial seed.

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
