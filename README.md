# Scholaris — Student Management System

A complete, production-shaped student management system for a single school. Scholaris brings student records, staff, classes and subjects, daily attendance, examinations, marks, report cards, and school-wide reporting into one calm administrative workspace.

Built with **React 19 + TypeScript + Tailwind CSS** on the front end and **Node.js + Express 5 + Prisma + SQLite** on the back end.

---

## Highlights

- **Role-based access** — a Super Administrator and administrators manage the school; teachers work with classes, attendance, and their own subjects.
- **Administrator profile** — identity, role, enforced permissions, account details, password change, and sign-out in one place.
- **Dark and light themes** — one application with a persistent, system-aware theme toggle on every page.
- **Responsive by design** — layouts tuned for desktop, laptop, tablet, Android, and iPhone, with a mobile navigation drawer and no horizontal overflow.
- **Student records** — registration, class placement, guardians, contact details, attendance health, exam history, and soft archiving.
- **Staff & academic structure** — teacher accounts, class teachers, subjects, and per-class subject assignments.
- **Daily attendance** — fast roll call with present/late/absent/excused states, notes, live summaries, and bulk save.
- **Examinations** — create exams per class, choose subjects and maximum marks, enter marks subject by subject, publish results, and lock marks.
- **Results & analytics** — automatic totals, percentages, grades, class ranks, subject averages, grade distribution, and CSV/print reports.
- **Dashboard** — enrolment, staffing, today's attendance, 14-day attendance trend, upcoming exams, top performers, and students needing support.
- **Secure defaults** — bcrypt password hashing, JWT in an httpOnly cookie, Helmet, CORS allow-listing, request validation with Zod, and rate limiting.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Client | React 19, TypeScript, Vite 7, Tailwind CSS 3, TanStack Query, React Hook Form, Zod, Recharts, lucide-react |
| Server | Node.js, Express 5, TypeScript, Prisma 6, SQLite, JWT, bcryptjs, Zod, Helmet |
| Testing | Vitest + Supertest (API), Playwright (browser journeys) |

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

`SUPER_ADMIN` and the legacy `ADMIN` role both have full administrative access. Administrator-only routes are guarded on the server by `requireAdmin`, so permissions are enforced by the API rather than merely hidden in the interface.

### Demo teacher accounts

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `priya.sharma@scholaris.edu` | `Teacher@12345` |
| Teacher | `sofia.alvarez@scholaris.edu` | `Teacher@12345` |

The seeds create 4 classes, 20 subjects, 5 teachers, 49 students (48 active and one archived), three weeks of attendance, four published mid-term exams with marks, and four upcoming draft exams. Administrator passwords are never printed, shipped to the browser, or committed.

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
| `JWT_SECRET` | 96-character random hex | Never reuse the development value |
| `JWT_EXPIRES_IN` | `8h` | Session lifetime |
| `COOKIE_SECURE` | `true` | Required behind HTTPS |
| `ADMIN_NAME` | `Mahesh Kumar` | Administrator display name |
| `ADMIN_EMAIL` | `admin@scholaris.edu` | Administrator sign-in email |
| `ADMIN_PASSWORD` | strong secret | Used once to provision the account; keep it in the host's secret store |

Production startup fails fast if `CLIENT_ORIGIN` is missing, is a localhost URL, or is not HTTPS. `ALLOW_LOCALHOST_ORIGIN=true` exists only for a local production smoke test.

### Deploying

The repository includes a `Dockerfile` and a `render.yaml` blueprint for a single-service deployment where Express serves both the API and the SPA.

> **Cost note:** `render.yaml` mounts a persistent disk for SQLite, which requires a paid Render instance type. Nothing is purchased automatically. Review and approve the cost before deploying, or use a free web service plus a free managed PostgreSQL database instead.

1. Create the service (Render, Railway, Fly.io, or any Docker host) and attach a persistent disk for the SQLite file, or provision PostgreSQL and update `server/prisma/schema.prisma`.
2. Set the environment variables above in the host's secret manager. Never commit `.env`.
3. Run migrations during release: `npm run db:deploy`.
4. Provision the administrator once: `npm run db:bootstrap-admin`.
5. Set `CLIENT_ORIGIN` to the final HTTPS URL before the first production start.

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
new_project/
├── client/                 React application
│   ├── src/
│   │   ├── components/     Layout, UI kit, theme toggle, reusable forms
│   │   ├── lib/            API client, auth context, theme provider, hooks, toasts, utils
│   │   ├── pages/          Dashboard, students, teachers, classes, attendance,
│   │   │                   exams, reports, profile, settings, login, 404
│   │   └── types.ts        Shared API response types
│   └── vite.config.ts
├── server/                 Express API
│   ├── prisma/             Schema, migrations, seed, administrator bootstrap, SQLite database
│   └── src/
│       ├── lib/            Auth, roles, dates, grades, results, attendance reports
│       ├── middleware/     Authentication and role guards
│       ├── routes/         Auth, dashboard, students, teachers, classes,
│       │                   subjects, attendance, exams, reports
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

All routes except `/api/health` and `/api/auth/login` require authentication. Administrator-only mutations are marked **A**; `SUPER_ADMIN` and `ADMIN` both qualify.

| Method & path | Purpose |
| --- | --- |
| `GET /api/health` | Service health |
| `POST /api/auth/login` | Sign in and set the session cookie |
| `POST /api/auth/logout` | Clear the session cookie |
| `GET /api/auth/me` | Current user |
| `PATCH /api/auth/password` | Change own password |
| `GET /api/dashboard` | School-wide dashboard metrics |
| `GET /api/students` | Search, filter, and paginate students |
| `GET /api/students/:id` | Full student profile, attendance, and results |
| `POST/PATCH/DELETE /api/students` **A** | Register, update, archive |
| `GET /api/teachers` **A** | Staff directory |
| `POST/PATCH/DELETE /api/teachers` **A** | Create, edit, deactivate staff |
| `GET /api/classes` | Classes with teachers, subjects, counts |
| `POST/PATCH/DELETE /api/classes` **A** | Manage classes |
| `GET /api/subjects` | Subjects, optionally filtered by class |
| `POST/PATCH/DELETE /api/subjects` **A** | Manage subjects and teacher assignment |
| `GET /api/attendance?classId=&date=` | Daily roster and summary |
| `POST /api/attendance` | Bulk upsert attendance |
| `GET /api/attendance/report` | Attendance report for a date range |
| `GET /api/exams` | Exams with progress |
| `GET /api/exams/:id` | Exam detail, students, marks, edit rights |
| `POST/PATCH/DELETE /api/exams` **A** | Create, edit, publish/unpublish, delete |
| `POST /api/exams/:id/marks` | Save subject marks (teachers: own subjects only) |
| `GET /api/exams/:id/results` | Computed results, ranks, statistics |
| `GET /api/reports/attendance` | Attendance report |
| `GET /api/reports/performance?examId=` | Performance report |

Errors return a consistent `{ "message": string, "details"?: ... }` shape with appropriate status codes (`401`, `403`, `404`, `409`, `422`).

---

## Data model

- **User** — login identity with `SUPER_ADMIN`, `ADMIN`, or `TEACHER` role, optional linked teacher profile.
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

- Passwords are hashed with bcrypt (12 rounds) and never returned by the API.
- Administrator credentials are provisioned from environment variables; generated passwords are written to a gitignored `600` file, never to the browser or logs.
- Sessions use a signed JWT stored in an **httpOnly**, `SameSite=Lax` cookie. Set `COOKIE_SECURE=true` behind HTTPS; production enables it automatically.
- The API enforces authentication and role checks on every protected route; teachers can only edit marks for their assigned subjects.
- Helmet sets security headers, CORS is an explicit origin allow-list, and login/API requests are rate-limited.
- Production configuration rejects localhost origins and non-HTTPS origins.
- All request bodies and query strings are validated with Zod.
- Students are **archived**, not deleted, so attendance and exam history are preserved.

For a multi-instance deployment, use a shared database (PostgreSQL) and a shared rate-limit store. SQLite is intentionally chosen here to keep local setup zero-dependency.

---

## Verification

The project has been verified with:

- `npm run typecheck` — server and client TypeScript checks pass.
- `npm run build` — both workspaces build successfully.
- `npm test` — 25 API tests covering health, authentication, RBAC, dashboard, reports, the student lifecycle, attendance, marks, publishing, and logout.
- `npm run test:e2e` — 6 Playwright journeys covering administrator identity, teacher permissions, theme toggle and refresh persistence, every page in both themes without horizontal overflow, mobile, and tablet layouts.
- Production smoke test — health, login, dashboard, students, exams, and SPA fallback served from the compiled server.

---

## License

Private educational project. Demo data is fictional.
