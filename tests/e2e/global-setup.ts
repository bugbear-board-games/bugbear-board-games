import { execFileSync } from "node:child_process";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../../src/lib/prismaClient";

export const OWNER_TEST_PASSWORD = "owner-e2e-password";

/**
 * Runs once before the browser tests: brings the Neon `test` branch up to date (migrations +
 * seed), and gives its Owner a known password so ownership-transfer tests can sign in.
 * playwright.config.ts has already loaded .env.test and refused anything but the test branch.
 */
export default async function globalSetup() {
  if (process.env.NEON_BRANCH !== "test") throw new Error("Refusing to run e2e setup outside the Neon test branch.");
  const env = { ...process.env, OWNER_EMAIL: process.env.OWNER_EMAIL ?? "owner@example.com", OWNER_PASSWORD: OWNER_TEST_PASSWORD };
  const opts = { env, stdio: "inherit" as const, shell: process.platform === "win32" };
  execFileSync("npx", ["tsx", "scripts/migrate-https.ts"], opts);
  execFileSync("npx", ["tsx", "prisma/seed.ts"], opts);

  const db = createPrismaClient();
  try {
    const owner = await db.user.findFirstOrThrow({ where: { role: "OWNER" } });
    await db.user.update({ where: { id: owner.id }, data: { passwordHash: await bcrypt.hash(OWNER_TEST_PASSWORD, 10) } });
    await db.session.deleteMany({ where: { userId: owner.id } });
    process.env.E2E_OWNER_EMAIL = owner.email; // inherited by the test workers
  } finally {
    await db.$disconnect();
  }
}
