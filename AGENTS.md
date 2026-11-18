# new_project — Scholaris student management system

A production-shaped monorepo for a school student management system:

- `client/` — React 19 + TypeScript + Vite + Tailwind CSS SPA.
- `server/` — Express 5 + TypeScript + Prisma 6 API using SQLite.
- `e2e/` — Playwright browser journeys.
- Root scripts coordinate both workspaces (`npm run dev`, `build`, `test`, `test:e2e`, `db:*`).

Read `README.md` first for setup, demo credentials, scripts, API routes, and architecture.

## Commands

Node is installed locally at `/home/mahesh/.local/node-v24.22.3-linux-x64`. If `node`/`npm` are not on PATH:

```bash
export PATH=/home/mahesh/.local/node-v24.22.3-linux-x64/bin:$PATH
```

- `npm run dev` — API on `http://localhost:4000`, Vite on `http://localhost:5173`.
- `npm run typecheck`, `npm run build`, `npm test`, `npm run test:e2e`.
- `npm run db:generate`, `db:migrate`, `db:seed`, `db:reset`, `db:studio`.
- Server env lives in `server/.env` (gitignored); template in `server/.env.example`.
- SQLite database: `server/prisma/dev.db` (gitignored). API tests recreate `server/prisma/test.db`.

Playwright uses installed Google Chrome via `channel: "chrome"`; see README for the Chromium alternative.

## Authentication architecture

- Registration is public but creates `PENDING` accounts for `TEACHER`/`STUDENT` only; an administrator must approve before login is possible.
- Roles: `SUPER_ADMIN`, `ADMIN`, `TEACHER`, `STUDENT`. `requireAdmin`, `requireSuperAdmin`, and `requireStaff` in `server/src/middleware/auth.ts` enforce access; never rely on client guards alone.
- Account lifecycle lives in `server/src/routes/admin.ts`; auth flows (registration, verification, password/email changes, reset) live in `server/src/routes/auth.ts`.
- `tokenVersion` invalidates sessions after password, email, role, or status changes. The last approved `SUPER_ADMIN` is protected.
- Verification/reset links use hashed single-use tokens (`server/src/lib/tokens.ts`) and optional SMTP (`server/src/lib/mailer.ts`). Without SMTP, links are logged and returned outside production.
- Relevant env: `APP_URL`, `REQUIRE_EMAIL_VERIFICATION`, `LOGIN_MAX_ATTEMPTS`, `LOGIN_LOCK_MINUTES`, `SMTP_*`, `MAIL_FROM`, `ALLOW_LOCALHOST_ORIGIN`.
- Tests: `server/tests/admin-auth.test.ts` covers the approval workflow and RBAC; `e2e/app.spec.ts` covers the browser journey. Both read admin credentials from `server/.env` and must never print or commit them.
- Migration `20261117072929_admin_controlled_auth` introduced statuses, audit logs, and login events on the existing `dev.db`.

## Git

- This project is its own git repository rooted at the current directory (`new_project`).
- Still stage explicit paths rather than `git add -A`, and never commit `server/.env`, SQLite files, `server/.admin-credentials`, or test output.
- Never print `git config`, `git remote -v`, or `.git/config` contents to chat: remotes may embed credentials.
- The enclosing `/home/mahesh` directory is a separate "Portfolio" repo; do not stage files from it.

## Siblings

- `/home/mahesh/Documents/projects/roadmap.ai` is a separate repo (Next.js 16 + Drizzle + Auth.js) with its own `AGENTS.md`. Don't modify it unless the task is about that project.
