import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Rebuilds an isolated SQLite database and loads the deterministic demo data
 * before the API test suite runs. The development database is never touched.
 */
export default function setup() {
  const env = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: "file:./test.db",
  };

  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--force-reset"], {
    cwd: serverDir,
    env,
    stdio: "pipe",
  });

  execFileSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: serverDir,
    env,
    stdio: "pipe",
  });
}
