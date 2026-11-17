import { app } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./db.js";

const server = app.listen(env.PORT, env.HOST, () => {
  const displayHost = env.HOST === "0.0.0.0" ? "localhost" : env.HOST;
  console.log(`\n  Scholaris API listening on ${env.HOST}:${env.PORT}`);
  console.log(`  Local: http://${displayHost}:${env.PORT}`);
  console.log(`  Environment: ${env.NODE_ENV}`);
  console.log(`  Allowed browser origins: ${env.allowedOrigins.join(", ")}\n`);
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
