import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "prisma", "migrations");
const migrations = readdirSync(DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort();

describe("prisma migrations", () => {
  it("every migration folder has a migration.sql with LF line endings", () => {
    // Checksums are taken over the raw bytes, so CRLF on one machine would look like an edit.
    for (const name of migrations) {
      const file = join(DIR, name, "migration.sql");
      expect(existsSync(file), name).toBe(true);
      expect(readFileSync(file, "utf8").includes("\r\n"), `${name} has CRLF`).toBe(false);
    }
  });

  it("migration folders sort in timestamp order", () => {
    for (const name of migrations) expect(name).toMatch(/^\d{14}_[a-z0-9_]+$/);
  });

  it("the legacy LeadershipContact table is dropped only when empty", () => {
    const sql = readFileSync(join(DIR, "20261113000000_drop_legacy_leadership", "migration.sql"), "utf8");
    const guard = sql.indexOf('EXISTS (SELECT 1 FROM "LeadershipContact")');
    const drop = sql.indexOf('DROP TABLE "LeadershipContact"');
    expect(guard).toBeGreaterThan(-1);
    expect(sql).toContain("RAISE EXCEPTION");
    expect(drop).toBeGreaterThan(guard);
  });

  it("the schema no longer defines LeadershipContact", () => {
    const schema = readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");
    expect(schema).not.toMatch(/model\s+LeadershipContact\b/);
  });
});
