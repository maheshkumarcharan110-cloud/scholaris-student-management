import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensureAdmin } from "./admin.js";

const prisma = new PrismaClient();

/**
 * First-boot administrator provisioning.
 *
 * Render runs this after migrations on every container start. It creates an
 * administrator only when none exists, so restarts and redeploys never reset
 * an existing password. Set ADMIN_EMAIL and ADMIN_PASSWORD for the first
 * deploy; they are not needed after the account exists.
 */
async function main() {
  const existing = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { email: true, role: true },
  });

  if (existing) {
    console.log(`Administrator already exists (${existing.email}); skipping bootstrap.`);
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error(
      "No administrator exists. Set ADMIN_EMAIL and ADMIN_PASSWORD for the first deployment.",
    );
    process.exitCode = 1;
    return;
  }

  const result = await ensureAdmin(prisma);
  console.log(`Administrator ${result.created ? "created" : "updated"}: ${result.user.email}`);
  console.log("Role: Super Administrator");
  console.log(
    result.passwordGenerated
      ? "A generated password was written to the credentials file."
      : "Password set from ADMIN_PASSWORD.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
