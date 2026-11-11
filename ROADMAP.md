# Roadmap

Phase 1 (done) is the public site, accounts and roles, events, and RSVPs. Below are the
long-term goals, with a recommended approach for each. Prices and free-tier limits change,
so check them before committing.

## 1. `@bugbearboardgames.com` email for Organizers and up

**Recommendation: use a hosted mail provider. Don't run our own mail server.**
Self-hosted mail is a lot of ongoing work: spam filtering, blocklists, and DKIM/SPF/DMARC.
And messages from a small new server often land in spam.

| Option | Cost | Notes |
|---|---|---|
| **Zoho Mail** (Forever Free plan) | Free for a small number of users | Real mailboxes on our domain. Web and mobile apps; desktop clients (IMAP) need a paid plan. Good starting point. |
| **Google Workspace** | Per-user monthly fee; free via Google for Nonprofits if we become a 501(c)(3) | Best experience (Gmail, Calendar, Drive). |
| **Cloudflare Email Routing** | Free | Forwarding only (e.g. `events@` → a personal Gmail). No mailboxes. Great for shared aliases. |

**Website integration (later):** both Zoho and Google have admin APIs. We could add an
"Issue email address" button on the Admin page that creates a mailbox when someone becomes an
Organizer, and suspends it when they're demoted. We'd also want a transactional sender
(Resend, Postmark, or Amazon SES) for password resets and RSVP confirmations.

## 2. Project board for Organizers

Two paths:

- **Integrate:** Asana and Trello both have free tiers for small teams. Fastest to start, but
  it's a separate login, and access doesn't follow our site roles automatically.
- **Build in (recommended once the team grows):** we already have accounts and roles, so a
  simple Kanban board is a modest addition: `Project`, `Task` (status column, assignee, due
  date, link to an Event), and comments. It's visible to Organizers and up, and needs no
  extra accounts. Open-source self-hosted alternatives (Planka, Wekan) are a middle ground.

Suggested first step: start on Trello or Asana free now. Build the native board when we know
which features we actually use.

## 3. Business reports and KPIs

Data already captured: events, capacity, and who RSVPed. `Rsvp.attended` is reserved for
check-in.

Next additions:
- **Check-in** on the event page for Organizers (mark who actually came). This gives the
  show-up rate.
- `Expense` and `Revenue` records tied to events (venue, snacks, games, door fees,
  sponsorships), plus general ones not tied to an event.
- A **Reports** page (Admin and up) with date-range filters and CSV export.

KPIs to brainstorm together:
- Attendance per event, RSVP to show-up rate, capacity fill rate
- New vs. returning attendees; members who haven't attended in 90 days
- Cost per attendee, profit/loss per event and per month
- Member growth over time; most popular days, venues, and event types
- Organizer workload (events hosted per organizer)

## Smaller improvements to consider

- Password reset via email (needs the transactional sender above)
- Event images, categories (e.g. "Beginner friendly", "Tournament"), recurring events
- Calendar export (.ics) and "Add to Google Calendar" links
- Waitlist when an event is full
- Email notifications for new events
