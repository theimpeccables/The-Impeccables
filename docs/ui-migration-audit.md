# UI migration audit

Audit date: 2026-10-15  
Repository: `/Users/anantpatel/theimpeccables`  
Scope: presentation-only migration requested by the user. No application code was changed for this audit.

## Audit result

The current application is a React/Vite frontend with an Express/Mongoose API. There is no separate `/design` directory in the checkout. The design references supplied in chat are role comparison mockups, not one export per page. They cover the dashboard, tasks, meetings, events, announcements, groups, members, approvals, leadership, settings, profile, login, and forgot password. They contain illustrative user names, counts, and dates; these must not be copied into the running UI.

The asset starter pack exists at `/Users/anantpatel/Downloads/impeccables_codebase_assets`. It includes logo, frame and background images plus a token stylesheet and a few sample UI components. It does not include every asset mentioned in the request (notably a full set of avatars, event posters, and 3D domain icons). Existing production assets are in `frontend/public` and `frontend/src/assets`.

The requested `ui-redesign` branch cannot yet have one commit per page: `git branch --show-current` reports `main`, `git log` reports that `main` has no commits, and `git status` shows the project files as untracked. A commit-based migration needs an initial tracked baseline. I have not created a branch or altered git state during this audit.

The design samples also show controls and summary data whose availability differs by role and from the current feature set. The existing behavior must remain the source of truth; those items are listed under **Gap list / Needs my decision** for review before their visual treatment is finalized.

## A. Page inventory

`usePublicData` is the shared read hook for public collection pages. Authenticated pages mostly call the shared `frontend/src/services/api.js` client directly. The API is mounted below the configured `/api` prefix in `backend/src/app.js`; endpoint paths below omit that prefix.

| Route | Component(s) | Data hooks/services and endpoints |
|---|---|---|
| `/` | `pages/public/Home.jsx`, `sections/HeroSection.jsx`, `HeroRightVisual.jsx`, `HomeSections.jsx`, `ImpactStatsSection.jsx`, `BroadcastTickerSection.jsx`, `CtaBannerSection.jsx`, `components/3d/*` | `usePublicData` and/or API-backed sections; reads public domains, posts, events, team and achievement content. Exact section requests live in the page/section components. |
| `/about` | `pages/public/About.jsx` | Static page content. |
| `/domains` | `pages/public/Domains.jsx`, `cards/DomainCard.jsx` | `usePublicData('/domains')`. |
| `/domains/:slug` | `pages/public/DomainDetail.jsx` | Domain lookup plus public posts/events for the selected domain via `usePublicData` and API client. |
| `/team` | `pages/public/Team.jsx`, `cards/TeamMemberCard.jsx` | `usePublicData('/team')`. |
| `/gallery` | `pages/public/Gallery.jsx`, `cards/PostCard.jsx`, `modals/PostLightboxModal.jsx` | `usePublicData('/posts', …)`; query/filter state remains page-owned. |
| `/gallery/:slug` | `pages/public/PostDetail.jsx` | `usePublicData('/posts/:slug')` or equivalent post detail request. |
| `/events` | `pages/public/Events.jsx`, `cards/EventCard.jsx` | `usePublicData('/events', …)`. |
| `/events/:slug` | `pages/public/EventDetail.jsx` | Public event detail; `GET /events/:eventId/volunteer-slots`; authenticated signup via `POST /volunteer-slots/:slotId/signup`. |
| `/achievements` | `pages/public/Achievements.jsx`, `cards/AchievementCard.jsx` | `usePublicData('/achievements')`. |
| `/announcements` | `pages/public/Announcements.jsx`, `cards/AnnouncementCard.jsx` | `usePublicData('/announcements', …)`. |
| `/contact` | `pages/public/Contact.jsx` | `POST /contact`. |
| `/login` | `pages/auth/Login.jsx` | `POST /auth/login`, Redux auth state, shared API client. |
| `/forgot-password` | `pages/auth/ForgotPassword.jsx` | `POST /auth/forgot-password`. |
| `/reset-password` | `pages/auth/ResetPassword.jsx` | `POST /auth/reset-password`. |
| `/dashboard` | `components/layout/DashboardLayout.jsx`, `pages/dashboard/MemberDashboard.jsx` | `GET /posts/mine`, `/tasks`, `/meetings`, `/attendance/me`, `/groups`; Redux auth/posts; shared API client. |
| `/dashboard/submit` | `pages/dashboard/SubmitPost.jsx` | `GET /domains`, `/events`, own drafts; `POST /posts`, `/posts/:id/media`, `/posts/:id/submit`; `PUT /posts/:id`. |
| `/dashboard/approvals` | `pages/dashboard/DomainAdminQueue.jsx` | `GET /approvals`; `POST /approvals/:id/decision`; `POST /posts/:id/publish`. |
| `/dashboard/attendance` | `pages/dashboard/AttendancePage.jsx`, `cards/MeetingCard.jsx` | `GET /meetings`, `/groups`, conditionally `/members`; `POST /meetings`; `PUT /meetings/:id/response`. |
| `/meetings/:meetingId` | `pages/dashboard/MeetingDetailPage.jsx` | `GET /meetings/:id`; `PUT /meetings/:id/response` and `/attendance/:userId`; `PATCH /meetings/:id`, `/agenda`, `/conclusion`; `POST /attendance/mark-all-present`, `/complete`. |
| `/dashboard/groups`, `/dashboard/groups/:groupId` | `pages/dashboard/GroupsPage.jsx` | `GET /groups`, `/groups/:id/members`, `/groups/:id/requests`, `/members/directory`; `POST /groups`, `/groups/:id/requests`, `/groups/:id/members`; `PATCH /groups/:id`, `/groups/requests/:id`, `/groups/:id/members/:userId`; relevant `DELETE` group/member/request/leave endpoints. |
| `/dashboard/tasks` | `pages/dashboard/TasksPage.jsx`, `cards/TaskCard.jsx` | `GET /tasks`, `/tasks/groups/:id/members`; `POST /tasks`. |
| `/tasks/:taskId` | `pages/dashboard/TaskDetailPage.jsx` | `GET /tasks/:id`; `PATCH /tasks/:id`; `POST /tasks/:id/submissions`, `/submissions/withdraw`, `/submissions/:userId/review`, `/submissions/approve-all`, `/comments`, `/remind`; `PUT /tasks/:id/assignees`; `DELETE /tasks/:id`. |
| `/dashboard/notifications` | `pages/dashboard/NotificationsPage.jsx`, `components/layout/NotificationBell.jsx` | `GET /notifications`; `PATCH /notifications/:id/read`, `/notifications/read-all`. Bell polls latest notifications and paginates older items. |
| `/dashboard/profile` | `pages/dashboard/ProfilePage.jsx` | `GET/PUT /members/me`; `POST/DELETE /members/me/photo`; Redux auth state is refreshed after profile changes. |
| `/dashboard/settings` | `pages/dashboard/SystemSettingsPage.jsx` | `GET /members/me`; super admin also `GET /admin/settings`; `PUT /auth/change-password`, `/members/me`; super admin `PATCH /admin/settings/:key`; forgot password uses `/auth/forgot-password`. |
| `/dashboard/content` | `pages/dashboard/ContentAdminPage.jsx` | `GET /admin/events`, `/domains`; create/update events, announcements, achievements, domains; create volunteer slots. |
| `/dashboard/audit` | `pages/dashboard/AuditPage.jsx` | `GET /admin/audit-logs`. |
| `/dashboard/members` | `pages/dashboard/AdminMembers.jsx` | `GET /members`, `/domains`; `POST /auth/register`; `PUT /members/:id/status`; `POST /roles/:id/assign`; `DELETE /roles/:id/revoke`. |
| `/dashboard/admin` | `pages/dashboard/AdminControl.jsx` | Redux permissions; `GET /admin/overview`; `POST /admin/reports/weekly`. |
| `*` | `components/common/RouteErrorBoundary.jsx` or router fallback | No domain data request. Router currently has a purple/monospace 404 fallback. |

Global authenticated shell: `DashboardLayout.jsx`, `NotificationBell.jsx`, `ImpeccablesLogo.jsx`, `ProtectedRoute.jsx`, Redux auth/post/UI slices, and the shared API client. Public shell: `Navbar.jsx`, `Footer.jsx`, `RouteErrorBoundary.jsx`.

## B. Role matrix (current behavior from route guards, API middleware and controllers)

Roles resolve as `super_admin` > `admin` > `domain_admin` (domain head/lead) > `member`. There is no MongoDB RLS layer in this repository; authorization is enforced in Express middleware and controller checks. `ProtectedRoute` is a frontend navigation gate, not the security boundary.

| Page/action | Member | Domain lead / organizer | Admin | Super admin | Enforcement location today |
|---|---|---|---|---|---|
| Public pages: view, contact, browse public content | Yes | Yes | Yes | Yes | Public routes/controllers; contact is rate-limited/validated. |
| Dashboard shell / personal profile | Authenticated access | Yes | Yes | Yes | `ProtectedRoute`; profile API requires auth and limits self-service profile/photo routes to the signed-in user. |
| Dashboard data | Own eligible data | Own plus domain-scoped data where controller permits | Club-wide for permitted reports | Full system scope | `MemberDashboard` requests plus API `requireAuth` / permission checks and data filters. |
| Meetings: view eligible meeting and own RSVP | Group members only | Eligible group members | Club access, subject to controller | Full access | `attendanceController` checks meeting membership; list/detail avoid returning other members’ RSVP/final attendance to non-managers. |
| Meetings: create/edit/cancel | No | Leads may create/manage meetings for groups they lead; organizer manages own meeting | Admin access | Full access | Controller checks organizer, lead, and admin roles; create validates selected group scope. |
| Meetings: view roster / mark final attendance / complete | Own final status only | Organizer or group lead | Admin | Full access | `attendanceController` manager checks and start-time checks; non-manager detail has no roster. |
| Groups: browse/request/leave | Yes, member view | Yes; can manage led group | Yes | Full access | `groupController` custom admin/lead checks; `requireAuth` on group router. |
| Groups: create/edit/archive, add/remove/promote members, decide requests | No | Only groups led, for scoped operations | Yes | Yes | `groupController` custom checks in endpoints; UI controls follow role/group state. |
| Tasks: list/view | Assigned tasks and own submission | Own/group-managed tasks | All tasks, view-only unless also creator/lead | All tasks | `taskWorkflowController` filters visibility and serializes member own submission only; controller checks assignment and group membership. |
| Tasks: create/edit/deadline/cancel/close/reassign/delete | No | Create/manage tasks they created or for groups they lead; super-only reassign/delete | View-only unless also creator/lead; may comment/remind | Full access | `taskWorkflowController` custom role/task checks; workflow route handlers require authentication. |
| Tasks: submit/resubmit/withdraw | Own assigned work | Own assigned work | Own assigned work if assigned | Own assigned work; may manage all | Controller requires assignment and limits submission mutations to current user. |
| Tasks: review/approve/request changes | No | Task manager | No unless also task manager | Yes | `taskWorkflowController` manager check; request-changes comment validation is server-side. |
| Tasks: comment/remind | No | Task manager | Yes | Yes | Controller permits manager or admin; reminders target assigned users without submissions. |
| Content submissions: create/edit own/submit | Yes, own | Yes, own | Yes | Yes | `contentRoutes` permission middleware plus owner checks in content controller. |
| Approvals: view/decide/publish | No | Domain-scoped queue and decisions | Club-wide | Full access | `approval:*` permission middleware and domain-scoped controller filters; publish has separate permission. |
| Events: public view/register/volunteer | Public view; authenticated member can signup | Same | Same | Same | Public listing; authenticated volunteer endpoints require permissions; signup scoped to the signed-in user. |
| Events/announcements/achievements: manage | No | Domain scoped only where current UI/API grants it | Admin permissions | Full access | `adminRoutes` permission middleware; some event/announcement authoring is admin-only today. |
| Members: list/create/change status/assign/revoke roles | No | No general member admin | Yes | Yes | `ProtectedRoute` allowed roles plus member/role endpoint permissions and controller checks. |
| Leadership/admin control | No | Domain-scoped read/view where applicable | Admin overview/report permissions | Full access incl. audit/settings | Route role guards and `requirePermission` middleware. |
| Notifications: read own/mark read | Yes | Yes | Yes | Yes | Authenticated notification endpoints scope records to current user. |
| Settings: personal/password/preferences | Yes through direct route only if authenticated | Yes | Yes | Yes | Password/profile/settings endpoints require auth; system settings require permission. Sidebar visibility currently differs by role. |
| Audit history | No | No | No | Yes | `/dashboard/audit` route allows super admin; API requires `audit:view`. |

## C. Logic-to-UI map (behaviors to preserve)

| Page/flow | Existing behavior that must survive visual changes |
|---|---|
| Authentication | Login initializes shared auth state; token refresh/session handling remains in the API/auth service; forgot/reset password retain the current endpoint payload and validation. |
| Dashboard | Counts/lists are loaded from the current endpoints and filtered by the API; no mock names, counts, or dates may be introduced. |
| Meetings | Group-scoped visibility; own RSVP upsert; a reason is required for “not attending”; RSVP closes after completion; organizer/group lead/admin roster access; attendance cannot be marked before meeting start; mark-all-present; completion warns about unmarked people and records them absent; agenda and conclusion editing; completed detail exposes conclusion and member’s final result; completion notification. |
| Tasks | Task assignment and group membership gate visibility; members receive only their own submission/status; uploaded files are private and signed on demand; 25 MB per file and 5-file/type rules; resubmissions preserve versions; review comment required for changes; only managers review; admin is view-only except comment/reminder unless also manager; organizer can close/cancel/edit; reminder targets people with no submission; 24-hour reminder job; notification triggers. |
| Groups | My-group/browse state; one pending request per user/group; decisions add the member or notify the requester; member lists are restricted; admin/lead membership management; changes and join requests emit notifications. |
| Profile/settings | Photo upload and delete are separate operations; avatar URL persists and updates Redux/header; text save must not clear photo; password change clears local session; personal notification preferences and system settings use current endpoints. |
| Notifications | Per-user list, unread count, mark-one/read-all, pagination, item navigation; existing bell fetch cadence/payload remains. |
| Content/approvals | Draft and media upload, submit, self-approval protections, domain queue scope, approve/reject/request changes, publish/moderate, event/announcement/achievement creation and editing. |
| Members/leadership/audit | Role/domain filters, status changes, role assignment/revocation, directory scoping, audit pagination/filters, reports/settings permissions and existing confirmation/validation behavior. |
| Public site | API-backed pages and content filters; volunteer signup; hero asset usage and responsive behavior. |

## D. Gap list / Needs my decision

1. **Design source format:** there is no `/design` directory or page-by-page design export in the checkout. The supplied images are dashboard composites with four role panes per module. I can treat the uploaded composites as visual references, but they do not specify all responsive states, interactions, empty/loading/error states, or every route.
2. **Mockup features not present or not confirmed in current behavior:** quick-action panels, charts/sparklines, task pagination/status/priority filters, member table selection/export/detail drawer, approval bulk actions/history/handler assignment, leadership reorder/import/public-visibility controls, settings tabs/preferences, profile statistics/social links, event registration/bookmark/calendar controls, and dashboard analytics are visible in some mockups. Some may exist elsewhere in the app; each must be checked against actual route behavior before designing it as an active control. Preserve existing current controls when mockup omits them.
3. **Names and taxonomy differ:** mockups show group/domain names such as Management, Graphics, Social Media, and Visual Media that are not in the current seeded default domain list. Use real API data; do not hardcode mock taxonomy.
4. **Public pages not shown in the supplied composites:** About, Domains, domain detail, Gallery, post detail, Team, Achievements, Contact, and public event details have no dedicated screenshot reference. Apply shared design tokens and the closest supplied visual language without inventing page content; these routes need later design review.
5. **Assets:** available pack includes `brand/logo-emblem.png`, `brand/logo-wordmark.png`, `brand/emblem-3d-render.png`, three backgrounds, and six frame crops. No provided people avatar set, event/poster library, or domain icon collection was found in the pack. Existing app assets and live API media can be reused; neutral placeholders are needed only where neither exists.
6. **Role baselines:** no authenticated browser sessions or screenshots of the current app for Super Admin, Admin, Domain Lead/Organizer, Member, or a no-group user are present in the workspace. This audit records source-backed behavior notes above, not a visual capture for each account. A live regression run needs the existing test accounts and running API/database/storage services.
7. **Version-control baseline:** the repository has no commit and all project files are untracked. The requested `ui-redesign` branch and reversible per-page commits need an initial commit/base to exist. Creating a commit from the full checkout would establish a repository baseline, which is a material git operation not performed during this audit.
8. **Component system:** the app uses custom wrappers under `frontend/src/components/ui` plus Radix primitives and Tailwind utility classes; the supplied pack has a small separate component sample. The design-system migration can restyle central wrappers, but page-local classes exist and need incremental replacement. `frontend/src/index.css` currently defines both red and older purple/blue styles; the 404 route still uses purple.

## E. Current behavior regression notes by role

These are source-level notes from the route guards, Redux role state, API middleware, and controllers. They are the available baseline until the app can be opened with each account. No current-role screenshots were captured during this audit.

- **Super Admin:** all authenticated routes; dashboard/admin data; all task/meeting/group scopes; member and role administration; system settings; audit history; task review/reassignment/delete; all server-authorized operations.
- **Admin:** general authenticated app; club-wide task visibility but task mutations/reviews only when also that task’s creator/lead; comments/reminders allowed; member management, approvals, content/event tools, reports; no audit page in route guard.
- **Domain Lead/Organizer (`domain_admin`):** general app; domain/group-scoped approval and management operations; groups they lead; tasks they created or manage through their group; meetings for groups they lead; cannot access admin-only member management or audit pages.
- **Member:** general app; own/group-eligible tasks and meetings; own RSVP and own task submission; public pages/events; groups browse/request/leave; own profile/settings/notifications; no other members’ task submissions or manager-only meeting attendance rows.
- **Authenticated user with no group:** can access public and personal routes; group-scoped tasks/meetings remain hidden unless independently assigned/eligible; can browse/request groups. Dashboard empty states should reflect actual endpoint results.

## F. Files reviewed

- `frontend/src/router.jsx`, `frontend/src/components/auth/ProtectedRoute.jsx`
- `frontend/src/components/layout/DashboardLayout.jsx`, `Navbar.jsx`, `NotificationBell.jsx`
- `frontend/src/hooks/usePublicData.jsx`, `frontend/src/services/api.js`, Redux auth/domain/post/UI slices
- `backend/src/app.js`, `backend/src/middleware/auth.js`, `backend/src/utils/authorization.js`, `backend/src/constants/permissions.js`
- API route modules for auth, members, groups, tasks/operations, meetings/attendance, content, admin, notifications, roles, domains, and public content
- Relevant controllers for task workflow, meetings, groups, profile/member, content/approval, and admin operations
- `/Users/anantpatel/Downloads/impeccables_codebase_assets/README.md`, included asset inventory, and `src/styles/globals.css`
