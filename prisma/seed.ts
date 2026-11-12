import "dotenv/config";
import bcrypt from "bcryptjs";
import { DEFAULT_CONTENT, DEFAULT_GUIDELINES, splitLegacyGuidelines } from "../src/lib/defaultContent";
import { createPrismaClient } from "../src/lib/prismaClient";

const prisma = createPrismaClient();

async function main() {
  // Default editable site text. Never overwrites edits an admin already made.
  for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
    await prisma.siteContent.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  // Guidelines now have one row per rule. The first time this runs, carry over the old
  // single-text guidelines (so edits made on the live site survive), else use the defaults.
  if ((await prisma.guideline.count()) === 0) {
    const legacy = await prisma.siteContent.findUnique({ where: { key: "guidelines" } });
    const rules = legacy?.value.trim() ? splitLegacyGuidelines(legacy.value) : DEFAULT_GUIDELINES;
    await prisma.guideline.createMany({ data: rules.map((r, i) => ({ ...r, sortOrder: i })) });
    console.log(`Guidelines: created ${rules.length} rules (${legacy ? "from the existing text" : "defaults"}).`);
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
  if (process.env.VERCEL_ENV === "production" && (password === "change-me-please" || email === "owner@example.com")) {
    throw new Error("Set a real OWNER_EMAIL and OWNER_PASSWORD in Vercel before the first production deploy.");
  }

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
