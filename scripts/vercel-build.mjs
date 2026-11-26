// Build used on Vercel. Local development keeps SQLite (prisma/schema.prisma);
// on the server the same schema is switched to PostgreSQL (Neon), the tables are
// created or updated, demo data is loaded once into an empty database, then Next.js builds.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.error(
    "\nDATABASE_URL must point to a PostgreSQL database.\n" +
      "In Vercel: Project → Storage → Create Database → Neon, connect it to this project, then redeploy.\n",
  );
  process.exit(1);
}

// Neon gives a pooled URL (for the app) and a direct one (for creating tables).
const env = { ...process.env, DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED || url };
const run = (command) => execSync(command, { stdio: "inherit", env });

const schema = readFileSync("prisma/schema.prisma", "utf8").replace(
  'provider = "sqlite"',
  'provider  = "postgresql"\n  directUrl = env("DATABASE_URL_UNPOOLED")',
);
writeFileSync("prisma/schema.postgres.prisma", schema);

run("npx prisma generate --schema prisma/schema.postgres.prisma");
run("npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate");
run("npx tsx prisma/seed-if-empty.ts");
run("npx next build");
