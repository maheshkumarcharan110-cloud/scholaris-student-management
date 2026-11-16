import { app } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./db.js";

const server = app.listen(env.PORT, () => {
  console.log(`\n  Scholaris API running at http://localhost:${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}\n`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
