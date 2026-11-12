/**
 * Applies pending Prisma migrations over HTTPS/WebSockets (port 443) instead of the Postgres
 * port (5432), which some networks block. Used locally (`npm run setup`) and by the Vercel build,
 * so every environment migrates the same way. It records migrations in the same
 * `_prisma_migrations` table with the same checksums as `prisma migrate deploy`, so the two
 * stay interchangeable on networks where 5432 works.
 *
 * Usage: npm run db:deploy:https   (uses DATABASE_URL_UNPOOLED from .env or the environment)
 */
import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = globalThis.WebSocket ?? ws;

const MIGRATIONS_DIR = join(__dirname, "..", "prisma", "migrations");

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is not set. Run `neon env pull --branch dev`.");
  console.log(`Target Neon branch: ${process.env.NEON_BRANCH ?? "(unknown — check .env)"}`);

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    // Same definition Prisma Migrate uses.
    await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )`);

    const { rows } = await client.query<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>(
      `SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`,
    );
    const failed = rows.filter((r) => !r.finished_at && !r.rolled_back_at);
    if (failed.length) {
      throw new Error(`A previous migration failed and needs attention: ${failed.map((r) => r.migration_name).join(", ")}`);
    }
    const applied = new Set(rows.filter((r) => r.finished_at).map((r) => r.migration_name));

    const names = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(MIGRATIONS_DIR, d.name, "migration.sql")))
      .map((d) => d.name)
      .sort();
    const pending = names.filter((n) => !applied.has(n));
    if (!pending.length) {
      console.log(`No pending migrations (${names.length} already applied).`);
      return;
    }

    for (const name of pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, name, "migration.sql"));
      const checksum = createHash("sha256").update(sql).digest("hex");
      const id = randomUUID();
      // Each migration and its bookkeeping row commit together, or not at all.
      await client.query("BEGIN");
      try {
        await client.query(sql.toString("utf8"));
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
           VALUES ($1, $2, $3, now(), now(), 1)`,
          [id, checksum, name],
        );
        await client.query("COMMIT");
        console.log(`Applied ${name}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${name} failed and was rolled back: ${(e as Error).message}`);
      }
    }
    console.log(`Done: ${pending.length} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
