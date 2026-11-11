import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Default editable site text. Never overwrites edits an admin already made.
  const defaults: Record<string, string> = {
    tagline: "Pittsburgh's friendly neighborhood board game community.",
    mission:
      "Bugbear Board Games brings Pittsburghers together around the table. We host welcoming game nights for everyone, from first-timers to seasoned strategists, and work to build a community where new friendships are just one dice roll away.",
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.siteContent.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  const existingOwner = await prisma.user.findFirst({ where: { role: "OWNER" } });
  if (existingOwner) {
    console.log(`Owner already exists (${existingOwner.email}); skipping owner creation.`);
    return;
  }

  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME?.trim() || "Site Owner";
  if (!email || !password) {
    throw new Error("Set OWNER_EMAIL and OWNER_PASSWORD in .env before seeding.");
  }
  if (password.length < 8) throw new Error("OWNER_PASSWORD must be at least 8 characters.");

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: "OWNER" },
    create: { email, name, passwordHash, role: "OWNER" },
  });
  console.log(`Owner account ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
