# Implementation roadmap

This roadmap adapts `impeccables_implementation_plan.md` to the repository as it exists today. The plan describes an empty Vite scaffold, but this repository already contains a React public site, dashboard screens, Redux state, and substantial mock data. Those parts will be audited and reused where they meet the requirements; demo-only behavior will not be treated as production authentication or persistence.

## Decisions for this implementation

- Keep the existing React 19 + Vite 8 frontend and MERN architecture.
- Use MongoDB through Mongoose for persistent application data.
- Use Cloudinary for image/video storage. Credentials belong in ignored local `.env` files; committed files contain names and placeholders only.
- Use SMTP through a configurable mail account for temporary development email credentials, supplied by the project owner. Do not commit or print those credentials.
- Redis/BullMQ remains configurable for background work. Features must degrade clearly when queue configuration is absent during local setup.
- Preserve the seven creative domains listed in the implementation plan as the baseline seed set.
- Keep the existing visual design and routes unless a plan feature requires a purposeful change.

## Ordered tasks

### Task 1 — Foundation & infrastructure

- [x] Inventory existing frontend/backend and record actual stack.
- [x] Add root and backend sample environment files; ensure secrets remain ignored.
- [x] Add root scripts for running frontend/backend together and quality checks.
- [x] Separate Express app construction from server startup.
- [x] Add validated environment config, safe structured errors/logging, security middleware, rate limits, CORS, and health/readiness endpoints.
- [x] Make MongoDB connection lifecycle explicit and graceful on shutdown.
- [x] Add Cloudinary, SMTP mail, and Redis configuration boundaries in sample config; service clients are implemented in their dependent feature phases.
- [x] Verify frontend production build and lint both frontend and backend source.

### Task 2 — Authentication, members & RBAC

- [x] Add indexed Mongoose models for users, member profiles, roles, permissions, assignments, domains, and club sessions.
- [x] Seed roles, permissions, seven domains, the current club session, and an optional first super-admin from environment variables.
- [x] Implement admin-created accounts, login, refresh, logout, password reset/change, and account status controls.
- [x] Use bcrypt password hashes, short-lived access tokens, rotating refresh tokens in secure httpOnly cookies, and one-time reset tokens.
- [x] Enforce permissions and domain scope on the server for every protected route currently implemented; domain-scoped business routes will apply the same middleware as those modules are added.
- [x] Add members/profile/directory and role-management APIs.
- [x] Replace demo role switching and browser-stored bearer credentials with real auth state and refresh handling.
- [x] Connect the login, password recovery, and member management UI to the API.

### Task 3 — Public website & content data

- [x] Audit existing public pages and routes against the sitemap.
- [x] Add public domains, published posts/gallery, events, announcements, team, achievements, contact, and sitemap APIs.
- [x] Replace public-page mock collections with API-backed data and loading/empty/error states.
- [x] Add event details/calendar export, route metadata, XML sitemap, and robots support.
- [x] Keep the existing responsive layouts and reduced-motion/3D fallback behavior.

### Task 4 — Content submissions & approvals

- [x] Add post/media/approval request/decision models and indexes.
- [x] Implement validated Cloudinary image/video uploads and deletion compensation.
- [x] Add draft/edit/submit/revision and approval queue APIs.
- [x] Enforce domain-scoped review, self-approval prevention, multi-approver rules, publish/unpublish, history, and audit events.
- [x] Connect create-post, submission history, and review queue screens to the API.
- [x] Published content is served through the same public gallery/domain APIs used by the site.

### Task 5 — Tasks & volunteer scheduling

- [x] Add task, assignment, status-history, volunteer-slot, and volunteer-assignment models.
- [x] Implement task creation, manual/automatic assignment APIs, status transitions, and workload-aware auto-allocation.
- [x] Implement volunteer signup/assignment APIs, capacity guards, shift-conflict detection, and event rosters.
- [x] Add member task UI, auto-allocation controls, and event volunteer signup UI backed by APIs.

### Task 6 — Meetings & attendance

- [x] Add meeting, attendance, and absence-request models with unique meeting/member records.
- [x] Implement meeting creation, eligibility, bulk attendance, individual history, reports, and absence decisions.
- [x] Connect attendance history and absence explanation screens to the API.

### Task 7 — Notifications & scheduled automation

- [x] Add notifications, announcements, email logs, reports, and system settings models.
- [x] Add in-app notifications and read/unread APIs/UI.
- [x] Implement tracked SMTP delivery and temporary-mail configuration.
- [x] Add optional BullMQ/Redis queue processing and idempotent IST schedules for birthdays, reports, deadlines, stale approvals, and event reminders.
- [x] Implement announcement delivery, preferences, and job health reporting.

### Task 8 — Analytics & administration

- [x] Add audit logs and record critical security-sensitive changes.
- [x] Implement dashboard aggregation and paginated admin APIs for audit/report data.
- [x] Add member/role/domain/settings/audit/report management screens backed by real data.

### Task 9 — Security, tests, deployment & handover

- [x] Review validation, authorization boundaries, uploads, cookies, CORS, rate limiting, and secret handling.
- [x] Add API health/404 tests and RBAC/domain-scope unit tests for critical contracts.
- [x] Add CI checks and deployment examples for Vercel plus Render/Railway.
- [x] Document environment setup, seed/bootstrap flow, backups, troubleshooting, and admin handover.
- [x] Run final lint/build/test checks and record account-provisioning dependencies.

## Environment-dependent handover

The application is implemented, but live provider-backed verification requires project-owner values in ignored local/deployment secrets: MongoDB, Cloudinary, SMTP, and (optionally) Redis. No credentials are stored in the repository. After filling the local samples, run the seed command, create a member account through the admin workflow, and verify an upload, SMTP delivery, and queued job against the selected provider accounts.

## Progress

- Current repository audit and actual stack identification: complete. Existing frontend screens were reused and connected to backend workflows.
- Tasks 1–9: implemented in dependency order.
- Automated checks: lint, frontend production build, backend endpoint contracts, and RBAC/domain-scope tests pass.
- External account verification: pending owner configuration of MongoDB, Cloudinary, SMTP, and optional Redis.
