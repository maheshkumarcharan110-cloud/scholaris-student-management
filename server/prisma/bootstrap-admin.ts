import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ensureAdmin } from "./admin.js";

const prisma = new PrismaClient();

async function main() {
  const result = await ensureAdmin(prisma);
  const action = result.created ? "created" : "updated";
  console.log(`Administrator ${action}: ${result.user.email}`);
  console.log(`Name: ${result.user.name}`);
  console.log("Role: Super Administrator");
  if (result.passwordGenerated) {
    console.log(`A one-time password was generated and written to ${result.credentialsFile} (mode 600).`);
    console.log("Read that file locally, sign in, then change the password from your profile.");
  } else {
    console.log("Password: unchanged or set from ADMIN_PASSWORD.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
