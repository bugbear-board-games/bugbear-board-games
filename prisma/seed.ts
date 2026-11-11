import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CONTENT } from "../src/lib/defaultContent";

const prisma = new PrismaClient();

async function main() {
  // Default editable site text. Never overwrites edits an admin already made.
  for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
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
