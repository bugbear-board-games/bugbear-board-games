-- Drop the legacy LeadershipContact table. The Contact page lists Organizers and up
-- automatically (User.displayTitle / User.publicEmail), so this table is unused.
-- Any rows still in it are first saved as JSON in SiteContent under the key
-- "legacy_leadership_backup" (never shown on the site), so nothing is lost.
DO $$
BEGIN
  IF to_regclass('"LeadershipContact"') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM "LeadershipContact") THEN
      INSERT INTO "SiteContent" ("key", "value", "updatedAt")
      SELECT 'legacy_leadership_backup',
             json_agg(json_build_object(
               'name', "name", 'title', "title", 'email', "email",
               'phone', "phone", 'sortOrder', "sortOrder"
             ) ORDER BY "sortOrder", "name")::text,
             now()
      FROM "LeadershipContact"
      ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = now();
    END IF;
    DROP TABLE "LeadershipContact";
  END IF;
END $$;
