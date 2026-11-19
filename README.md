# Scholaris — Student Management System

A complete, production-shaped student management system for a single school. Scholaris brings student records, staff, classes and subjects, daily attendance, examinations, marks, report cards, and school-wide reporting into one calm administrative workspace.

Built with **React 19 + TypeScript + Tailwind CSS** on the front end and **Node.js + Express 5 + Prisma + SQLite** on the back end.

---

## Highlights

- **Role-based access** — `SUPER_ADMIN`, `ADMIN`, `TEACHER`, and `STUDENT` accounts, with every permission enforced by the API.
- **Administrator-controlled registration** — public requests stay `PENDING` until an administrator approves them; rejected and suspended accounts cannot sign in.
- **Account security** — verified email changes, current-password reauthentication, session revocation, login lockout, audit logs, and a full administrator activity trail.
- **Administrator profile** — identity, role, enforced permissions, account details, password change, and sign-out in one place.
- **Dark and light themes** — one application with a persistent, system-aware theme toggle on every page.
- **Responsive by design** — layouts tuned for desktop, laptop, tablet, Android, and iPhone, with a mobile navigation drawer and no horizontal overflow.
- **Student records** — registration, class placement, guardians, contact details, attendance health, exam history, and soft archiving.
- **Staff & academic structure** — teacher accounts, class teachers, subjects, and per-class subject assignments.
- **Daily attendance** — fast roll call with present/late/absent/excused states, notes, live summaries, and bulk save.
- **Examinations** — create exams per class, choose subjects and maximum marks, enter marks subject by subject, publish results, and lock marks.
- **Results & analytics** — automatic totals, percentages, grades, class ranks, subject averages, grade distribution, and CSV/print reports.
- **Dashboard** — enrolment, staffing, today's attendance, 14-day attendance trend, upcoming exams, top performers, and students needing support.
- **Secure defaults** — bcrypt password hashing, JWT in an httpOnly cookie, CSRF origin checks, Helmet, CORS allow-listing, Zod validation, login lockout, and rate limiting.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Client | React 19, TypeScript, Vite 7, Tailwind CSS 3, TanStack Query, React Hook Form, Zod, Recharts, lucide-react |
| Server | Node.js, Express 5, TypeScript, Prisma 6, SQLite, JWT, bcryptjs, Zod, Helmet |
| Testing | Vitest + Supertest (API), Playwright (browser journeys) |

---

## Repository

- **GitHub**: [maheshkumarcharan110-cloud/scholaris-student-management](https://github.com/maheshkumarcharan110-cloud/scholaris-student-management)
- **Visibility**: Public
- **Default branch**: `main`
- **Clone**: `git clone https://github.com/maheshkumarcharan110-cloud/scholaris-student-management.git`

---

## Quick start

### Prerequisites

- **Node.js 20.19+** (developed on Node 24)
- npm 10+

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the server environment

```bash
cp server/.env.example server/.env
```

Generate a strong JWT secret and put it in `server/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The default configuration uses SQLite at `server/prisma/dev.db` and runs the API on port `4000`, bound to all interfaces (`HOST=0.0.0.0`).

### 3. Create the database, demo data, and administrator

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`db:seed` loads the school demo data and provisions the administrator through the same secure bootstrap as `npm run db:bootstrap-admin`.

To create or upgrade the administrator without reseeding:

```bash
npm run db:bootstrap-admin
```

### 4. Start the development servers

```bash
npm run dev
```

- Web app: **http://localhost:5173**
- API: **http://localhost:4000**
- Health check: **http://localhost:4000/api/health**

The Vite dev server proxies `/api` to the Express server, so the browser uses one origin. Vite binds to `0.0.0.0`, so other devices on the same Wi-Fi can reach it (see [Local network access](#local-network-access)).

---

## Administrator account

The administrator is configured through environment variables, never through source code:

| Variable | Purpose | Default |
| --- | --- | --- |
| `ADMIN_NAME` | Display name | `Mahesh Kumar` |
| `ADMIN_EMAIL` | Sign-in email | `admin@scholaris.edu` |
| `ADMIN_PASSWORD` | Password to set when bootstrapping | generated if omitted |

`npm run db:bootstrap-admin` is idempotent:

- If an account with `ADMIN_EMAIL` exists, it is **updated** in place.
- Otherwise, an existing administrator is **promoted** to `SUPER_ADMIN`.
- Only when no administrator exists is a new account created.
- An existing password is **never reset** unless `ADMIN_PASSWORD` is explicitly supplied.
- If a new account is created without `ADMIN_PASSWORD`, a random password is written to `server/.admin-credentials` with POSIX mode `600`. That file is gitignored.

`SUPER_ADMIN` has full administrative authority. `ADMIN` accounts manage teachers, students, and school data but cannot create or modify administrator accounts. Administrator-only routes are guarded on the server by `requireAdmin` and `requireSuperAdmin`, so permissions are enforced by the API rather than merely hidden in the interface.

The initial Super Administrator can change their own sign-in email and password from **Security** in the sidebar. Both actions require the current password; the email change also requires confirmation from the new inbox. Other administrator credentials are never printed, returned, or reset without explicit action.

### Demo teacher accounts

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `priya.sharma@scholaris.edu` | `Teacher@12345` |
| Teacher | `sofia.alvarez@scholaris.edu` | `Teacher@12345` |

The seeds create 4 classes, 20 subjects, 5 teachers, 49 students (48 active and one archived), three weeks of attendance, four published mid-term exams with marks, and four upcoming draft exams. Administrator passwords are never printed, shipped to the browser, or committed.

---

## Registration and approval

Anyone who can reach the public URL can open `/register` and request an account with a name, email, optional phone number, password, and a requested role of **Teacher** or **Student**. Public registration can never request or create an `ADMIN` or `SUPER_ADMIN` account.

On submit the API:

1. Validates every field with Zod, including email format and password strength (at least 10 characters, a letter, and a number).
2. Rejects duplicate email addresses with `409 EMAIL_TAKEN`.
3. Hashes the password with bcrypt (12 rounds).
4. Stores the account with status `PENDING`, `active = false`, and the requested role.
5. Sends a verification link when SMTP is configured (otherwise the link is logged and, outside production, returned for local testing).

The registration response is always:

> Your account has been created successfully. Your registration is awaiting approval from the administrator. You will be able to access Scholaris once your account has been approved.

Registration never grants access. Login is evaluated after the password is verified, and the outcome depends on the account state:

| Status | Result |
| --- | --- |
| `PENDING` | Denied with an “awaiting administrator approval” message |
| `APPROVED` | Allowed, subject to role permissions |
| `REJECTED` | Denied with the rejection message |
| `SUSPENDED` | Denied with the suspension message |
| Email unverified | Denied when `REQUIRE_EMAIL_VERIFICATION=true`; approval still requires an administrator |

### Administrator dashboard

Sign in as the Super Administrator and use the **Administration** group in the sidebar:

- **Account overview** — registration statistics, pending queue, accounts by role, recent sign-ins.
- **Users & registrations** — tabs for All, Pending, Approved, Rejected, and Suspended accounts, with search, role filter, approve, reject, suspend, reactivate, role assignment, and per-account login/audit history.
- **Roles & permissions** — the role matrix and server-enforced hierarchy.
- **Activity logs** — append-only account actions and login history.

Approval records who approved the account and when, revokes nothing unnecessarily, and notifies the applicant when SMTP is configured. Rejection and suspension record an optional reason and immediately revoke existing sessions.

### Roles and permissions

| Role | Capabilities |
| --- | --- |
| `SUPER_ADMIN` | Full administration, including managing `ADMIN` and `SUPER_ADMIN` accounts, approvals, roles, security, and audit review |
| `ADMIN` | Approve and manage teachers and students, school data, and reports; cannot create or modify administrators |
| `TEACHER` | Dashboard, students, classes, attendance, marks for assigned subjects, and reports |
| `STUDENT` | Own profile, security settings, and own activity only |

Backend enforcement is mandatory:

- `authenticate` re-loads the account, checks `APPROVED` status and `tokenVersion`, and rejects stale sessions after password, email, role, or status changes.
- `requireAdmin`, `requireSuperAdmin`, and `requireStaff` guard routes; hiding a button is never the security boundary.
- The last approved `SUPER_ADMIN` cannot be demoted or suspended, and an administrator cannot change their own role or status.
- Students are blocked from `/api/dashboard`, `/api/students`, and all other staff APIs, even when they request the URL directly.

### Email verification, email changes, and password reset

- Verification, email-change, and password-reset tokens are random, hashed at rest, single-use, and time-limited.
- Changing a sign-in email requires the current password plus confirmation from the new inbox; the old address stays active until then.
- Changing a password requires the current password. The current session stays signed in and every other session is revoked.
- `POST /api/auth/logout-all` revokes every session, including the current one.
- Password reset uses `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`, with the same generic response whether or not the account exists.

### SMTP configuration

Email delivery is optional. Without SMTP, Scholaris still runs the full workflow: verification and reset links are logged server-side and, outside production, returned by the API so you can complete the flow locally. In production, configure SMTP before enabling `REQUIRE_EMAIL_VERIFICATION`:

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="no-reply@example.com"
SMTP_PASS="smtp-password"
MAIL_FROM="Scholaris <no-reply@example.com>"
REQUIRE_EMAIL_VERIFICATION=true
```

---

## Themes

- The toggle lives in the top bar on every authenticated page and on the login page.
- A moon icon switches to dark mode; a sun icon switches back to light mode.
- The choice is saved in `localStorage` under `scholaris-theme` and restored before the first paint, so a refresh never flashes the wrong theme.
- With no saved choice, the app follows the operating system preference.
- Theme changes sync across tabs and update the browser `theme-color`.
- Brand navy, marigold, and cream are preserved in both modes; the dark theme re-tones surfaces, text, tables, forms, charts, and navigation for contrast.

---

## Local network access

Both servers bind to all interfaces:

- Vite: `0.0.0.0:5173` (`host: "0.0.0.0"` in `client/vite.config.ts`)
- API: `0.0.0.0:4000` (`HOST=0.0.0.0` in `server/.env`)

Find this machine's LAN address:

```bash
hostname -I
# or
ip -4 route get 1.1.1.1
```

Then open, from another device on the **same Wi-Fi network**:

```
http://<LAN-IP>:5173
```

For example, if `hostname -I` reports `192.168.1.50`, use `http://192.168.1.50:5173`.

If the page does not load from another device:

1. Confirm both devices are on the same network and the phone is not using mobile data.
2. Allow inbound TCP `5173` (and `4000` for direct API checks) in the host firewall. On Ubuntu with `ufw`: `sudo ufw allow 5173/tcp`.
3. Some guest/AP-isolated Wi-Fi networks block device-to-device traffic; use a trusted network or a tunnel.
4. Confirm the servers are listening: `ss -ltnp | grep -E ':4000|:5173'`.

Do **not** forward these ports from the internet. The development server is not hardened for public exposure. Use the production build behind HTTPS instead.

---

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

`npm run build` compiles the server to `server/dist` and the client to `client/dist`. In production the Express server also serves the compiled single-page app from the same origin, so the whole application is available at the server's `PORT`.

### Required production environment

| Variable | Example | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | Enables production cookie and origin checks |
| `DATABASE_URL` | `file:./prod.db` | SQLite path, or a managed PostgreSQL URL after switching the Prisma provider |
| `PORT` | `4000` | Usually supplied by the host |
| `HOST` | `0.0.0.0` | Bind to the container/host interface |
| `CLIENT_ORIGIN` | `https://scholaris.example.com` | Comma-separated allow-list; must be HTTPS and must not be localhost |
| `APP_URL` | `https://scholaris.example.com` | Public base URL used in verification, email-change, and reset links |
| `JWT_SECRET` | 96-character random hex | Never reuse the development value |
| `JWT_EXPIRES_IN` | `8h` | Session lifetime |
| `COOKIE_SECURE` | `true` | Required behind HTTPS |
| `REQUIRE_EMAIL_VERIFICATION` | `false` | Set to `true` only after SMTP is configured |
| `LOGIN_MAX_ATTEMPTS` | `5` | Failed attempts before a temporary lockout |
| `LOGIN_LOCK_MINUTES` | `15` | Lockout duration in minutes |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `smtp.example.com` / `587` / `false` | Optional outbound mail |
| `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | mailbox credentials / `Scholaris <no-reply@example.com>` | Optional sender identity |
| `ADMIN_NAME` | `Mahesh Kumar` | Administrator display name |
| `ADMIN_EMAIL` | `admin@scholaris.edu` | Administrator sign-in email |
| `ADMIN_PASSWORD` | strong secret | Used only on the first start to create the administrator; keep it in the host's secret store |

Production startup fails fast if `CLIENT_ORIGIN` resolves to localhost or is not HTTPS. On Render, `CLIENT_ORIGIN` and `APP_URL` default to `RENDER_EXTERNAL_URL`; on other hosts set them explicitly. `ALLOW_LOCALHOST_ORIGIN=true` exists only for a local production smoke test.

### Deploying

The repository includes a `Dockerfile` and a `render.yaml` blueprint for a single-service deployment where Express serves both the API and the SPA.

> **Cost note:** `render.yaml` mounts a persistent disk for SQLite, which requires a paid Render instance type. Nothing is purchased automatically. Review and approve the cost before deploying, or use a free web service plus a free managed PostgreSQL database instead.

1. Create the service (Render, Railway, Fly.io, or any Docker host) and attach a persistent disk for the SQLite file, or provision PostgreSQL and update `server/prisma/schema.prisma`.
2. Set the environment variables above in the host's secret manager. Never commit `.env`.
3. On first start the container runs `npm run db:deploy` and `npm run db:ensure-admin`. The administrator is created only when none exists, so restarts never reset an existing password.
4. Set `CLIENT_ORIGIN` and `APP_URL` only for a custom domain or a non-Render host; Render supplies `RENDER_EXTERNAL_URL` automatically.
5. Optional: seed demo data once from the host shell with `npm run db:seed` (destructive; use only on a demo database).

### Render

1. Create a Render account and connect the GitHub repository.
2. Choose **New → Blueprint** and select `scholaris-student-management`. `render.yaml` creates a Starter Docker web service with a 1 GB persistent disk mounted at `/data`.
3. When prompted, set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD`; they are used only for the first boot. Adjust `ADMIN_NAME` if desired.
4. Deploy. The stable URL is `https://<service>.onrender.com`; HTTPS, `CLIENT_ORIGIN`, and `APP_URL` are handled automatically from `RENDER_EXTERNAL_URL`.
5. After the first successful deploy, remove `ADMIN_PASSWORD` from the Render environment if you do not want it stored. Existing administrator credentials are never reset.
6. For a custom domain, add it in Render and set `CLIENT_ORIGIN` and `APP_URL` to the custom HTTPS origin.

Render's free tier does not support persistent disks, so the SQLite setup requires the Starter plan (about $7/month). For a free deployment, use a managed PostgreSQL database and change the Prisma provider.

When the API and SPA share an origin, leave `VITE_API_URL` empty so the client calls `/api` directly. Set it only when the API is hosted separately, for example `VITE_API_URL=https://scholaris-api.example.com/api`.

SQLite on a single instance is fine for a small school. For multiple instances or managed hosting, switch the Prisma provider to PostgreSQL, set `DATABASE_URL`, regenerate the client, and run `npm run db:deploy`.

---

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the API and Vite dev server together |
| `npm run build` | Type-check and build server and client |
| `npm start` | Start the compiled server (set `NODE_ENV=production` to serve the client) |
| `npm run typecheck` | Type-check both workspaces |
| `npm test` | Run the Vitest + Supertest API suite |
| `npm run test:e2e` | Run the Playwright browser journeys |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create/apply a development migration |
| `npm run db:deploy` | Apply committed migrations in production |
| `npm run db:seed` | Load demo data and provision the administrator |
| `npm run db:bootstrap-admin` | Create, update, or promote the administrator safely |
| `npm run db:ensure-admin` | Create the first administrator only if none exists (used on container start) |
| `npm run db:reset` | Drop, re-migrate, and re-seed the database |
| `npm run db:studio` | Open Prisma Studio |

### Browser tests

The Playwright configuration reads `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` from `server/.env`, uses the locally installed **Google Chrome** (`channel: "chrome"`), and starts the dev server automatically if it is not already running. Install Chrome, or switch the config to bundled Chromium:

```bash
npx playwright install chromium
# then remove `channel: "chrome"` from playwright.config.ts
```

---

## Project structure

```
scholaris-student-management/
├── client/                 React application
│   ├── src/
│   │   ├── components/     Layout, UI kit, theme toggle, auth shell, account cards
│   │   ├── lib/            API client, auth context, theme provider, hooks, toasts, utils
│   │   ├── pages/          Dashboard, students, teachers, classes, attendance,
│   │   │                   exams, reports, profile, settings, security, auth
│   │   │                   (register, verify, forgot/reset), admin overview/users/
│   │   │                   roles/activity, 404
│   │   └── types.ts        Shared API response types
│   └── vite.config.ts
├── server/                 Express API
│   ├── prisma/             Schema, migrations, seed, administrator bootstrap;
│   │                       local SQLite databases are gitignored
│   └── src/
│       ├── lib/            Auth, roles, tokens, mailer, audit, dates, grades, results
│       ├── middleware/     Authentication, role guards, CSRF origin guard
│       ├── routes/         Auth, admin, dashboard, students, teachers, classes,
│       │                   attendance, exams, reports
│       ├── schemas.ts      Zod request validation
│       ├── app.ts          Express application and CORS allow-list
│       └── index.ts        HTTP server and graceful shutdown
├── e2e/                    Playwright journeys
├── Dockerfile              Single-service production image
├── render.yaml             Render blueprint
├── playwright.config.ts
└── package.json            npm workspaces and root scripts
```

---

## API overview

All routes except `/api/health`, the public auth endpoints, and the SPA fallback require authentication. `A` marks administrator-only routes; `S` marks Super-Administrator-only operations.

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Service health |
| `POST /api/auth/register` | Public registration request (`PENDING`) |
| `POST /api/auth/login` | Sign in and set the session cookie |
| `POST /api/auth/logout` | Clear the session cookie |
| `POST /api/auth/logout-all` | Revoke every session for the account |
| `GET /api/auth/me` | Current user |
| `POST /api/auth/verify-email` | Verify an email with a one-time token |
| `POST /api/auth/resend-verification` | Resend a verification link |
| `POST /api/auth/forgot-password` | Request a password-reset link |
| `POST /api/auth/reset-password` | Complete a password reset |
| `PATCH /api/auth/profile` | Update own name and phone |
| `PATCH /api/auth/password` | Change own password (requires current password) |
| `POST /api/auth/email-change` | Request an email change |
| `POST /api/auth/verify-email-change` | Confirm the new email |
| `GET /api/auth/activity` | Own recent logins and account actions |
| `GET /api/admin/overview` **A** | Registration statistics and recent activity |
| `GET /api/admin/users` **A** | Search and filter accounts by status and role |
| `GET /api/admin/users/:id` **A** | Account detail, login history, audit trail |
| `POST /api/admin/users/:id/approve` / `reject` / `suspend` / `reactivate` **A** | Account lifecycle actions |
| `PATCH /api/admin/users/:id/role` **A/S** | Assign a role; administrator roles require Super Administrator |
| `GET /api/admin/activity` **A** | Paginated audit log |
| `GET /api/admin/login-events` **A** | Paginated login history |
| `GET /api/admin/roles` **A** | Role catalogue and permissions |
| `GET /api/dashboard` **staff** | School-wide dashboard metrics |
| `GET /api/students` **staff** | Search, filter, and paginate students |
| `GET /api/students/:id` **staff** | Full student profile, attendance, and results |
| `POST/PATCH/DELETE /api/students` **A** | Register, update, archive |
| `GET /api/teachers` **A** | Staff directory |
| `POST/PATCH/DELETE /api/teachers` **A** | Create, edit, deactivate staff |
| `GET /api/classes` **staff** | Classes with teachers, subjects, counts |
| `POST/PATCH/DELETE /api/classes` **A** | Manage classes |
| `GET /api/subjects` **staff** | Subjects, optionally filtered by class |
| `POST/PATCH/DELETE /api/subjects` **A** | Manage subjects and teacher assignment |
| `GET /api/attendance?classId=&date=` **staff** | Daily roster and summary |
| `POST /api/attendance` **staff** | Bulk upsert attendance |
| `GET /api/attendance/report` **staff** | Attendance report for a date range |
| `GET /api/exams` **staff** | Exams with progress |
| `GET /api/exams/:id` **staff** | Exam detail, students, marks, edit rights |
| `POST/PATCH/DELETE /api/exams` **A** | Create, edit, publish/unpublish, delete |
| `POST /api/exams/:id/marks` **staff** | Save subject marks (teachers: own subjects only) |
| `GET /api/exams/:id/results` **staff** | Computed results, ranks, statistics |
| `GET /api/reports/attendance` **staff** | Attendance report |
| `GET /api/reports/performance?examId=` **staff** | Performance report |

Errors return a consistent `{ "message": string, "code"?: string, "details"?: ... }` shape with appropriate status codes (`401`, `403`, `404`, `409`, `422`, `423`, `429`).

---

## Data model

- **User** — login identity with `SUPER_ADMIN`, `ADMIN`, `TEACHER`, or `STUDENT` role, account status (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`), email-verification metadata, approval/rejection/suspension records, optional linked teacher profile, and a token version for session invalidation.
- **AuditLog** — append-only record of registrations, approvals, rejections, suspensions, role changes, profile and credential changes, with actor, target, IP, and detail.
- **LoginEvent** — every successful or blocked sign-in attempt with reason, IP, and user agent.
- **Teacher** — employee profile linked one-to-one with a user; may be a class teacher and subject teacher.
- **Class** — grade, section, academic year, room, optional class teacher.
- **Subject** — belongs to a class and optionally to a teacher; unique code per class.
- **Student** — admission details, guardian, class placement, status (`ACTIVE`, `INACTIVE`, `GRADUATED`).
- **Attendance** — one record per student per day, optional note and recorder.
- **Exam** — per class and term, draft or published.
- **ExamSubject** — subject included in an exam with maximum marks.
- **Mark** — one score per exam, subject, and student; recorded by a teacher.

Attendance dates and exam dates are stored as UTC-midnight values and exchanged as `YYYY-MM-DD` strings.

---

## Security notes

- Passwords are hashed with bcrypt (12 rounds) and never returned by the API. Login and password-reset responses never reveal whether an email exists.
- Registration is public, but every account is created `PENDING` and requires administrator approval. Public requests cannot create `ADMIN` or `SUPER_ADMIN` accounts.
- Administrator credentials are provisioned from environment variables; generated passwords are written to a gitignored `600` file, never to the browser or logs. Existing administrator passwords are never reset without an explicit password change.
- Sessions use a signed JWT stored in an **httpOnly**, `SameSite=Lax` cookie. Set `COOKIE_SECURE=true` behind HTTPS; production enables it automatically.
- A `tokenVersion` claim invalidates every existing session after a password change, email change, role change, rejection, or suspension.
- State-changing requests pass a CSRF origin guard that compares `Origin`/`Referer` with the configured allow-list.
- Failed sign-ins are counted per account; after `LOGIN_MAX_ATTEMPTS` the account is temporarily locked for `LOGIN_LOCK_MINUTES`. Rate limiters also cover login and sensitive auth endpoints.
- Email verification, email-change, and password-reset tokens are random, hashed at rest, single-use, and time-limited. Changing an email or password requires the current password.
- The API enforces authentication, account status, and role checks on every protected route; teachers can only edit marks for their assigned subjects, and students are limited to their own profile and security endpoints.
- Helmet sets security headers, CORS is an explicit origin allow-list, and production configuration rejects localhost and non-HTTPS origins.
- All request bodies and query strings are validated with Zod; Prisma parameterizes queries.
- Administrator actions are written to an append-only audit log, and every sign-in attempt is recorded with its outcome.
- Students are **archived**, not deleted, so attendance and exam history is preserved.

For a multi-instance deployment, use a shared database (PostgreSQL) and a shared rate-limit store. SQLite is intentionally chosen here to keep local setup zero-dependency.

---

## Verification

The project has been verified with:

- `npm run typecheck` — server and client TypeScript checks pass.
- `npm run build` — both workspaces build successfully.
- `npm test` — 43 API tests across `server/tests/api.test.ts` and `server/tests/admin-auth.test.ts`, covering health, authentication, the complete registration → pending → approval → login workflow, rejection, suspension/reactivation, student isolation, RBAC, email verification, email changes, password changes, administrator password change/restore, CSRF, dashboard, reports, the student lifecycle, attendance, marks, publishing, and logout.
- `npm run test:e2e` — 8 Playwright journeys covering administrator identity, teacher permissions, the full public registration and approval journey, security reauthentication rejection, theme toggle and refresh persistence, every page in both themes without horizontal overflow, mobile, and tablet layouts.
- Production smoke test — health, login, `/api/auth/me`, administrator overview, public pages, and SPA fallback served from the compiled server.

### Public URL and tunnels

The current public demo is served through a temporary Cloudflare Quick Tunnel in front of the production build. Quick Tunnel hostnames are ephemeral: they change whenever the tunnel restarts and carry no uptime guarantee. For a permanent URL, deploy the Docker image to a host with a stable domain and set `CLIENT_ORIGIN` and `APP_URL` to that HTTPS origin. This environment does not hold hosting or SMTP credentials, so permanent deployment and outbound email remain configuration steps for the operator.

---

## License

Educational project. Demo data is fictional. No license is granted for redistribution or reuse.
