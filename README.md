# Scholaris — Student Management System

A complete, production-shaped student management system for a single school. Scholaris brings student records, staff, classes and subjects, daily attendance, examinations, marks, report cards, and school-wide reporting into one calm administrative workspace.

Built with **React 19 + TypeScript + Tailwind CSS** on the front end and **Node.js + Express 5 + Prisma + SQLite** on the back end.

---

## Highlights

- **Role-based access** — administrators manage the school; teachers work with classes, attendance, and their own subjects.
- **Student records** — registration, class placement, guardians, contact details, attendance health, exam history, and soft archiving.
- **Staff & academic structure** — teacher accounts, class teachers, subjects, and per-class subject assignments.
- **Daily attendance** — fast roll call with present/late/absent/excused states, notes, live summaries, and bulk save.
- **Examinations** — create exams per class, choose subjects and maximum marks, enter marks subject by subject, publish results, and lock marks.
- **Results & analytics** — automatic totals, percentages, grades, class ranks, subject averages, grade distribution, and CSV/print reports.
- **Dashboard** — enrolment, staffing, today's attendance, 14-day attendance trend, upcoming exams, top performers, and students needing support.
- **Polished UX** — responsive layouts, accessible controls, loading skeletons, empty states, error recovery, toasts, confirmation dialogs, and print-friendly report cards.
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

The default configuration uses SQLite at `server/prisma/dev.db` and runs the API on port `4000`.

### 3. Create the database and load demo data

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

Or run the whole setup in one command:

```bash
npm run setup
```

### 4. Start the development servers

```bash
npm run dev
```

- Web app: **http://localhost:5173**
- API: **http://localhost:4000**
- Health check: **http://localhost:4000/api/health**

The Vite dev server proxies `/api` to the Express server, so the browser uses one origin.

---

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Administrator | `admin@scholaris.edu` | `Admin@12345` |
| Teacher | `priya.sharma@scholaris.edu` | `Teacher@12345` |
| Teacher | `sofia.alvarez@scholaris.edu` | `Teacher@12345` |

The seeds create 4 classes, 20 subjects, 5 teachers, 49 students (48 active and one archived), three weeks of attendance, four published mid-term exams with marks, and four upcoming draft exams.

---

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

`npm run build` compiles the server to `server/dist` and the client to `client/dist`. In production the Express server also serves the compiled single-page app, so the whole application is available at **http://localhost:4000**.

Set `COOKIE_SECURE=true` when the app is served over HTTPS.

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
| `npm run db:seed` | Reset demo data |
| `npm run db:reset` | Drop, re-migrate, and re-seed the database |
| `npm run db:studio` | Open Prisma Studio |

### Browser tests

The Playwright configuration uses the locally installed **Google Chrome** (`channel: "chrome"`). Install Chrome, or switch the config to bundled Chromium:

```bash
npx playwright install chromium
# then remove `channel: "chrome"` from playwright.config.ts
```

The test runner starts the dev server automatically if it is not already running.

---

## Project structure

```
new_project/
├── client/                 React application
│   ├── src/
│   │   ├── components/     Layout, UI kit, reusable forms
│   │   ├── lib/            API client, auth context, hooks, toasts, utils
│   │   ├── pages/          Dashboard, students, teachers, classes, attendance,
│   │   │                   exams, reports, settings, login, 404
│   │   └── types.ts        Shared API response types
│   └── vite.config.ts
├── server/                 Express API
│   ├── prisma/             Schema, migrations, seed, SQLite database
│   └── src/
│       ├── lib/            Auth, dates, grades, results, attendance reports
│       ├── middleware/     Authentication and role guards
│       ├── routes/         Auth, dashboard, students, teachers, classes,
│       │                   subjects, attendance, exams, reports
│       ├── schemas.ts      Zod request validation
│       ├── app.ts          Express application
│       └── index.ts        HTTP server and graceful shutdown
├── e2e/                    Playwright journeys
├── playwright.config.ts
└── package.json            npm workspaces and root scripts
```

---

## API overview

All routes except `/api/health` and `/api/auth/login` require authentication. Administrator-only mutations are marked **A**.

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

- **User** — login identity with `ADMIN` or `TEACHER` role, optional linked teacher profile.
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
- Sessions use a signed JWT stored in an **httpOnly**, `SameSite=Lax` cookie. Set `COOKIE_SECURE=true` behind HTTPS.
- The API enforces authentication and role checks on every protected route; teachers can only edit marks for their assigned subjects.
- Helmet sets security headers, CORS is restricted to `CLIENT_ORIGIN`, and login/API requests are rate-limited.
- All request bodies and query strings are validated with Zod.
- Students are **archived**, not deleted, so attendance and exam history are preserved.

For a multi-instance deployment, use a shared database (PostgreSQL) and a shared rate-limit store. SQLite is intentionally chosen here to keep local setup zero-dependency.

---

## Verification

The project has been verified with:

- `npm run typecheck` — server and client TypeScript checks pass.
- `npm run build` — both workspaces build successfully.
- `npm test` — 25 API tests covering health, authentication, RBAC, dashboard, reports, the student lifecycle, attendance, marks, publishing, and logout.
- `npm run test:e2e` — Playwright journeys for the administrator, teacher permissions, and mobile navigation.
- Production smoke test — health, login, dashboard, students, exams, and SPA fallback served from the compiled server.

---

## License

Private educational project. Demo data is fictional.
