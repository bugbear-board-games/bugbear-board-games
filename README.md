# Bugbear Board Games

The website for Bugbear Board Games, a board game community in Pittsburgh, PA.

Visitors can read the mission, see upcoming events, and find leadership contacts without signing in.
Members sign in to RSVP. Organizers post events, and Admins and the Owner manage the site.

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env      # then edit OWNER_EMAIL / OWNER_PASSWORD
npm run setup             # creates the database, default site text, and the Owner account
npm run dev               # http://localhost:3000
```

Sign in with the `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env`, then open **Admin** to set the
mission text, add leadership contacts, and promote people.

## Roles

Each role can do everything the roles below it can.

| Role | Can |
|---|---|
| **Owner** (exactly one) | Make anyone an Admin, Organizer, or Member. Transfer ownership to another account (password + "TRANSFER" confirmation). No one else can change the Owner's role. |
| **Admin** | Edit site text (tagline, mission) and leadership contacts. Promote Members to Organizer or move Organizers back to Member. Cannot change other Admins or the Owner. |
| **Organizer** | Create, edit, and delete events. See who has RSVPed. |
| **Member** | Create an account and RSVP to events. |
| *Visitor* | View everything public without signing in. |

Every permission is checked on the server in `src/actions/*`, so hidden buttons are never the
only protection. The rules live in one place: [`src/lib/roles.ts`](src/lib/roles.ts).

## Project layout

```
prisma/schema.prisma     database models (users, sessions, events, RSVPs, site text, leaders)
prisma/seed.ts           default site text + Owner account
src/app/                 pages (Next.js App Router)
src/actions/             server actions: every write goes through here, with permission checks
src/lib/roles.ts         role hierarchy and who-can-assign-what
src/lib/auth.ts          sessions (hashed tokens in the DB, httpOnly cookie)
src/lib/time.ts          all event times are Pittsburgh time (America/New_York)
src/lib/content.ts       list of admin-editable text blocks
src/app/globals.css      theme: colors taken from the logo
public/logo.png          the logo (the only artwork used)
```

**Adding another editable text block** (e.g. a "How to find us" blurb): add it to
`EDITABLE_CONTENT` in `src/lib/content.ts` and give it a default in `prisma/seed.ts`.
It then appears on the Admin page automatically, and you render it wherever you like.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Type-check |
| `npm run setup` | Create/update the database schema and seed it |
| `npm run db:studio` | Browse and edit the database in a web UI |

## Deploying

SQLite is fine for local development but not for most hosts. For production:

1. Create a free Postgres database (e.g. [Neon](https://neon.tech) or [Supabase](https://supabase.com)).
2. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
3. Deploy to [Vercel](https://vercel.com) (or Railway/Render), setting `DATABASE_URL`,
   `OWNER_EMAIL`, `OWNER_PASSWORD`, and `OWNER_NAME` as environment variables.
4. Run `npx prisma db push && npm run db:seed` once against the production database.
5. Point `bugbearboardgames.com` at the host.

See [ROADMAP.md](ROADMAP.md) for email, the project board, and business reports.

## Known limitations

- No "forgot password" email yet. It needs an email-sending service (see roadmap). Until then,
  an Admin can reset a password with `npm run db:studio`, or the user can create a new account.
- Login rate limiting is in memory, so it resets on restart and isn't shared across servers.
