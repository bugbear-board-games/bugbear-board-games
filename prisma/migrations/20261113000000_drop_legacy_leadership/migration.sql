-- Drop the legacy LeadershipContact table. The Contact page lists Organizers and up
-- automatically (User.displayTitle / User.publicEmail), so this table is unused.
-- Guard: refuse to drop it if it still holds rows, so no contact data is lost silently.
-- The migration runner wraps this in a transaction, so a refusal rolls back cleanly
-- and stops the deploy.
DO $$
BEGIN
  IF to_regclass('"LeadershipContact"') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM "LeadershipContact") THEN
      RAISE EXCEPTION 'LeadershipContact still has rows; copy them to member profiles (Admin > Leadership) before dropping it.';
    END IF;
    DROP TABLE "LeadershipContact";
  END IF;
END $$;
