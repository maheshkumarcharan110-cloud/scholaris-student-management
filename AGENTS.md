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

## Git is rooted above this directory

- This is **not** its own git repo. The enclosing repo root is `/home/mahesh` (the "Portfolio" repo), which tracks only `README.md`.
- `git status` run here reports the entire home directory, including personal data such as `.ssh/`, `.config/`, `.cache/`, and shell history.
- Never run `git add -A`, `git add .`, or `git commit -a` from here — they stage everything in the home directory. Stage explicit paths only.
- If this should be a standalone project, run `git init` here instead of relying on the home repo.
- `/home/mahesh/.git/config` embeds a GitHub token in the `origin` URL. Never print `git config`, `git remote -v`, or `.git/config` contents to chat.

## Siblings

- `/home/mahesh/Documents/projects/roadmap.ai` is a separate repo (Next.js 16 + Drizzle + Auth.js) with its own `AGENTS.md`. Don't modify it unless the task is about that project.
