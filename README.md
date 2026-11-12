# Bugbear Board Games

The website for Bugbear Board Games, a board game community in Pittsburgh, PA.

Visitors can read about the community, see upcoming events, read the community guidelines, and
find leadership contacts without signing in. Members sign in to RSVP. Organizers post events,
and Admins and the Owner manage the site.

## Quick start (local development)

Requires Node.js 20 or newer and access to the club's [Neon](https://neon.tech) project
(`bugbear-board-games`). Its `main` branch is production; `dev` is for local work.

```bash
npm install
npm i -g neon@latest && neon login     # Neon CLI, once per computer
cp .env.example .env                   # then set OWNER_EMAIL / OWNER_PASSWORD
neon env pull --branch dev             # writes DATABASE_URL / DATABASE_URL_UNPOOLED for dev
npm run setup                          # creates the tables, default site text, and the Owner
npm run dev                            # http://localhost:3000
```

Check that `.env` says `NEON_BRANCH=dev` before running migrations or experiments.

Sign in with the `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env`, change the Owner's name on the
**Account** page, then open **Admin** to edit site text, add leadership contacts, and promote people.

## Features

- **Public pages:** home (tagline + blurb + next events), events, community guidelines, contact.
- **Events:** title, description, structured address (with a Google Maps link), start and end
  date/time, optional capacity, and an optional image shown on a transparent, light, or dark
  backing. All times are Pittsburgh time.
- **Repeating events:** every week, every other week, or monthly on chosen weeks (e.g. "every
  first and third Wednesday"). Dates are posted about 60 days ahead so each has its own RSVPs.
  Organizers can edit or cancel a single date, or edit/delete the whole series.
- **RSVPs** with capacity limits; members see their upcoming RSVPs on their Account page.
- **Moderation:** Admins can ban an email (signs the person out, blocks sign-in and sign-up)
  and give a locked-out member a temporary password.

## Roles

Each role can do everything the roles below it can.

| Role | Can |
|---|---|
| **Owner** (exactly one) | Make anyone an Admin, Organizer, or Member. Ban or reset the password of Admins. Transfer ownership (password + "TRANSFER" confirmation). Nobody can change the Owner's role, ban them, or reset their password. |
| **Admin** | Edit site text (tagline, home blurb, guidelines) and leadership contacts. Promote Members to Organizer or move Organizers back to Member. Ban emails and reset passwords for Members and Organizers. Cannot act on other Admins or the Owner. |
| **Organizer** | Create, edit, and delete events and series. See who has RSVPed. |
| **Member** | Create an account and RSVP to events. |
| *Visitor* | View everything public without signing in. |

Every permission is checked on the server in `src/actions/*`, so hidden buttons are never the
only protection. The rules live in one place: [`src/lib/roles.ts`](src/lib/roles.ts).

## Project layout

```
prisma/schema.prisma     database models
prisma/migrations/       database migrations (applied automatically on deploy)
prisma/seed.ts           default site text + Owner account (safe to re-run)
neon.ts                  Neon project config (created by `neon init`; new branches auto-expire after 7 days)
src/app/                 pages (Next.js App Router); src/app/images/[id] serves uploaded images
src/actions/             server actions: every write goes through here, with permission checks
src/lib/roles.ts         role hierarchy and who can act on whom
src/lib/auth.ts          sessions (hashed tokens in the DB, httpOnly cookie) and bans
src/lib/recurrence.ts    repeat-rule date math ("first and third Wednesday")
src/lib/series.ts        creates and updates the dates of repeating events
src/lib/images.ts        image upload checks (type sniffing, 4 MB cap) and cleanup
src/lib/location.ts      address fields, formatting, and map links
src/lib/time.ts          all event times are Pittsburgh time (America/New_York)
src/lib/content.ts       list of admin-editable text blocks (defaults in src/lib/defaultContent.ts)
src/app/globals.css      theme: colors taken from the logo
public/logo.png          the logo
```

**Adding another editable text block:** add it to `EDITABLE_CONTENT` in `src/lib/content.ts`
and give it a default in `src/lib/defaultContent.ts`. It then appears on the Admin page.

**Changing the database:** edit `prisma/schema.prisma`, then generate the SQL for the change by
comparing against the last committed schema (works offline, no database connection needed):

```bash
git show HEAD:prisma/schema.prisma > /tmp/old.prisma
mkdir prisma/migrations/YYYYMMDDHHMMSS_what_changed
npx prisma migrate diff --from-schema-datamodel /tmp/old.prisma --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/YYYYMMDDHHMMSS_what_changed/migration.sql
npm run db:deploy:https    # apply it to your dev branch
```

Commit the new folder; the next deploy applies it to production.

**Database connection:** the app talks to Neon through Neon's serverless driver over HTTPS/WebSockets
(`src/lib/prismaClient.ts`), so it works even on networks that block the Postgres port (5432).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build (applies migrations and seeds first) / serve |
| `npm run lint` | Type-check |
| `npm test` / `npm run test:e2e` | Unit tests / browser tests (see Testing) |
| `npm run setup` | Apply migrations (over HTTPS) and seed the database in `.env` |
| `npm run db:deploy:https` | Apply pending migrations over HTTPS (works on networks that block port 5432) |
| `npm run db:studio` | Browse and edit the database in a web UI |

## Testing

Every change should come with tests, and both suites should pass before committing.

| Command | What it runs |
|---|---|
| `npm test` | Unit tests (Vitest) in `tests/unit/`: schedule math, permissions, address/link checks, Pittsburgh time |
| `npm run test:e2e` | Browser tests (Playwright) in `tests/e2e/`: real sign-ups, events, images, admin pages, mobile header |
| `npm run test:all` | Both |

The browser tests use a separate Neon branch called `test`, so they never touch dev or
production data. One-time setup per computer:

```bash
neon env pull --branch test --file .env.test
```

They start their own server on port 3100 with a separate build folder (`.next-test`), so they can
run while `npm run dev` is open. They use the installed Microsoft Edge; to use Playwright's own
Chromium instead (e.g. on CI), run `npx playwright install chromium` and set `PW_CHANNEL=chromium`.
After a failure, `npx playwright show-report` shows screenshots and a step-by-step trace.

## Deploying (Vercel + Neon)

1. **Vercel:** sign in with GitHub, choose **Add New → Project**, and import
   `bugbear-board-games/bugbear-board-games`. The defaults are correct for Next.js.
2. **Environment variables** (Project → Settings → Environment Variables):

   | Name | Production | Preview |
   |---|---|---|
   | `DATABASE_URL` | Neon `main` branch, pooled URL | Neon `dev` branch, pooled URL |
   | `DATABASE_URL_UNPOOLED` | Neon `main` branch, direct URL | Neon `dev` branch, direct URL |
   | `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_NAME` | the real Owner | anything |

   Keep the production database **Production-only**. Every build runs migrations, so a preview
   build of an unmerged branch must not point at production data.
3. **Deploy.** The build applies migrations, adds the default site text, creates the Owner
   (only if none exists), and builds the site. Every push to `main` redeploys automatically.
4. **After the first deploy:** sign in as the Owner and change the password on the Account page.
   You can then delete `OWNER_PASSWORD` from Vercel; it's only used to create the first Owner.
5. **Domain:** in Vercel, Project → Settings → Domains, add the domain and follow the DNS
   instructions (or buy the domain through Vercel, which configures DNS for you).

See [ROADMAP.md](ROADMAP.md) for email, the project board, and business reports.

## Known limitations

- No self-service "forgot password" email yet; it needs an email-sending service (see roadmap).
  Until then, an Admin uses **Reset** on the Admin page to give the member a temporary password.
- Login rate limiting is in memory, so on Vercel it's per server instance and resets often.
- Images are stored in the database. Fine for event images; move to object storage (R2/S3)
  if uploads become frequent or large.
