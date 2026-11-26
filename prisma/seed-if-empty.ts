// Loads the demo data only when the database has no users yet, so redeploys
// never wipe real data. Used by scripts/vercel-build.mjs.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.count();
  await prisma.$disconnect();
  if (users > 0) {
    console.log(`Database already has ${users} users: demo data not loaded.`);
    return;
  }
  console.log("Empty database: loading demo data…");
  await import("./seed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
