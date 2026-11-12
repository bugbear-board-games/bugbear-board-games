import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { EDITABLE_CONTENT, getSiteContent } from "@/lib/content";
import { assignableRoles, canBan, rank, ROLE_LABELS, type Role } from "@/lib/roles";
import { platformLabel, SOCIAL_PLATFORMS } from "@/lib/social";
import { toLocalInputValue } from "@/lib/time";
import {
  banEmail, deleteAnnouncement, deleteGuideline, deleteSocialLink, moveGuideline, resetUserPassword,
  saveAnnouncement, saveGuideline, saveSocialLink, setUserRole, transferOwnership, unbanEmail,
  updateLeaderCard, updateSiteContent,
} from "@/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";
import { TransferOwnershipFields } from "@/components/TransferOwnershipFields";

export const metadata: Metadata = { title: "Admin" };

function GuidelineFields({ title = "", body = "" }: { title?: string; body?: string }) {
  return (
    <>
      <label>Title<input name="title" required maxLength={200} defaultValue={title} placeholder="Be a good sport!" /></label>
      <label>Description<textarea name="body" rows={3} maxLength={2000} defaultValue={body}
        placeholder="It's okay to play to win, but no one likes a sore winner/loser." /></label>
    </>
  );
}

function AnnouncementFields({ title = "", body = "", showUntil = "" }: { title?: string; body?: string; showUntil?: string }) {
  return (
    <>
      <label>Title<input name="title" required maxLength={120} defaultValue={title} placeholder="Holiday game night moved" /></label>
      <label>Message<textarea name="body" required rows={4} defaultValue={body} /></label>
      <label>
        Show until <span className="muted">(leave blank to show until you delete it)</span>
        <input type="date" name="showUntil" defaultValue={showUntil} />
      </label>
    </>
  );
}

function SocialFields({ platform = "instagram", url = "" }: { platform?: string; url?: string }) {
  return (
    <div className="form-row">
      <label>
        Platform
        <select name="platform" defaultValue={platform}>
          {SOCIAL_PLATFORMS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
      </label>
      <label>Link<input name="url" required defaultValue={url} placeholder="https://instagram.com/…" inputMode="url" /></label>
    </div>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ transferred?: string }> }) {
  const me = await requireRole("ADMIN");
  const { transferred } = await searchParams;
  const [content, guidelines, announcements, socialLinks, users, bans] = await Promise.all([
    getSiteContent(),
    db.guideline.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.announcement.findMany({ orderBy: { createdAt: "desc" } }),
    db.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
    db.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true, displayTitle: true, publicEmail: true } }),
    db.ban.findMany({ orderBy: { createdAt: "desc" }, include: { bannedBy: { select: { name: true } } } }),
  ]);
  const bannedEmails = new Set(bans.map((b) => b.email));
  const nameByEmail = new Map(users.map((u) => [u.email, u.name]));
  users.sort((a, b) => rank(b.role) - rank(a.role) || a.name.localeCompare(b.name));
  const leaders = users.filter((u) => rank(u.role) >= rank("ORGANIZER") && !bannedEmails.has(u.email));
  const now = new Date();

  return (
    <div className="container page">
      <h1>Admin</h1>
      {transferred && me.role !== "OWNER" && (
        <p className="msg msg-success" role="status" style={{ marginBottom: 20 }}>
          Ownership transferred to {transferred}. You are now an Admin.
        </p>
      )}
      <nav className="admin-nav" aria-label="Admin sections">
        <a href="#content" className="btn btn-ghost btn-sm">Site text</a>
        <a href="#announcements" className="btn btn-ghost btn-sm">Announcements</a>
        <a href="#social" className="btn btn-ghost btn-sm">Social links</a>
        <a href="#guidelines" className="btn btn-ghost btn-sm">Guidelines</a>
        <a href="#leadership" className="btn btn-ghost btn-sm">Leadership</a>
        <a href="#members" className="btn btn-ghost btn-sm">Members &amp; roles</a>
        <a href="#bans" className="btn btn-ghost btn-sm">Bans</a>
        {me.role === "OWNER" && <a href="#ownership" className="btn btn-ghost btn-sm">Ownership</a>}
      </nav>

      <section id="content" className="panel">
        <h2>Site text</h2>
        <ActionForm action={updateSiteContent} submitLabel="Save site text">
          {EDITABLE_CONTENT.map((c) => (
            <label key={c.key}>
              {c.label}
              {c.multiline
                ? <textarea name={c.key} rows={6} required defaultValue={content[c.key]} />
                : <input name={c.key} required defaultValue={content[c.key]} />}
              {c.hint && <span className="muted field-hint">{c.hint}</span>}
            </label>
          ))}
        </ActionForm>
      </section>

      <section id="announcements" className="panel">
        <h2>Announcements</h2>
        <p className="muted">
          Active announcements appear at the top of the home page. The section is hidden when there are none.
        </p>
        {announcements.map((a) => {
          const expired = !!a.showUntil && a.showUntil <= now;
          return (
            <details key={a.id} className="leader-edit">
              <summary>
                {a.title}{" "}
                {expired
                  ? <span className="status-badge status-off">Ended</span>
                  : <span className="status-badge status-on">Showing</span>}
              </summary>
              <div className="edit-body">
                <ActionForm action={saveAnnouncement.bind(null, a.id)} submitLabel="Save announcement">
                  <AnnouncementFields title={a.title} body={a.body}
                    showUntil={a.showUntil ? toLocalInputValue(a.showUntil).slice(0, 10) : ""} />
                </ActionForm>
                <ConfirmButton action={deleteAnnouncement.bind(null, a.id)} label="Delete announcement" confirmLabel="Yes, delete" />
              </div>
            </details>
          );
        })}
        <div className="leader-edit">
          <h3>New announcement</h3>
          <ActionForm action={saveAnnouncement.bind(null, null)} submitLabel="Post announcement" resetOnSuccess>
            <AnnouncementFields />
          </ActionForm>
        </div>
      </section>

      <section id="social" className="panel">
        <h2>Social links</h2>
        <p className="muted">Shown on the home page under &ldquo;Find us online&rdquo;, in this order.</p>
        {socialLinks.map((l) => (
          <details key={l.id} className="leader-edit">
            <summary>{platformLabel(l.platform)} <span className="muted">· {l.url}</span></summary>
            <div className="edit-body">
              <ActionForm action={saveSocialLink.bind(null, l.id)} submitLabel="Save link">
                <SocialFields platform={l.platform} url={l.url} />
              </ActionForm>
              <ConfirmButton action={deleteSocialLink.bind(null, l.id)} label="Remove link" confirmLabel="Yes, remove" />
            </div>
          </details>
        ))}
        <div className="leader-edit">
          <h3>Add a link</h3>
          <ActionForm action={saveSocialLink.bind(null, null)} submitLabel="Add link" resetOnSuccess>
            <SocialFields />
          </ActionForm>
        </div>
      </section>

      <section id="guidelines" className="panel">
        <h2>Community guidelines</h2>
        <p className="muted">Each rule is numbered automatically by its position. Use the arrows to reorder.</p>
        <ol className="guideline-admin">
          {guidelines.map((g, i) => (
            <li key={g.id} className="guideline-admin-item">
              <span className="hex-num" aria-hidden="true">{i + 1}</span>
              <details>
                <summary>{g.title}</summary>
                <div className="edit-body">
                  <ActionForm action={saveGuideline.bind(null, g.id)} submitLabel="Save rule">
                    <GuidelineFields title={g.title} body={g.body} />
                  </ActionForm>
                  <ConfirmButton action={deleteGuideline.bind(null, g.id)} label="Delete rule" confirmLabel="Yes, delete" />
                </div>
              </details>
              <div className="move-buttons">
                <ActionForm action={moveGuideline.bind(null, g.id, -1)} className="inline-form" submitLabel="↑"
                  pendingLabel="…" buttonClassName="btn btn-ghost btn-sm" disabled={i === 0} ariaLabel={`Move rule ${i + 1} up`} />
                <ActionForm action={moveGuideline.bind(null, g.id, 1)} className="inline-form" submitLabel="↓"
                  pendingLabel="…" buttonClassName="btn btn-ghost btn-sm" disabled={i === guidelines.length - 1} ariaLabel={`Move rule ${i + 1} down`} />
              </div>
            </li>
          ))}
        </ol>
        <div className="leader-edit">
          <h3>Add a rule</h3>
          <ActionForm action={saveGuideline.bind(null, null)} submitLabel="Add rule" resetOnSuccess>
            <GuidelineFields />
          </ActionForm>
        </div>
      </section>

      <section id="leadership" className="panel">
        <h2>Leadership</h2>
        <p className="muted">
          Everyone who is an Organizer or above appears on the Contact page automatically. Set the title they
          show (it defaults to their role) and, optionally, a public contact email, such as a club address.
          Account emails are never shown publicly.
        </p>
        {leaders.map((u) => (
          <details key={u.id} className="leader-edit">
            <summary>
              {u.name} <span className="muted">· {u.displayTitle || ROLE_LABELS[u.role as Role]}</span>
            </summary>
            <div className="edit-body">
              <ActionForm action={updateLeaderCard.bind(null, u.id)} submitLabel="Save card">
                <div className="form-row">
                  <label>Displayed title
                    <input name="displayTitle" maxLength={60} defaultValue={u.displayTitle ?? ""} placeholder={ROLE_LABELS[u.role as Role]} />
                  </label>
                  <label>Public contact email
                    <input type="email" name="publicEmail" defaultValue={u.publicEmail ?? ""} placeholder="name@bugbearboardgames.com" />
                  </label>
                </div>
              </ActionForm>
            </div>
          </details>
        ))}
      </section>

      <section id="members" className="panel">
        <h2>Members &amp; roles</h2>
        <p className="muted">
          {me.role === "OWNER"
            ? "As Owner, you can make anyone a Member, Organizer, or Admin."
            : "Admins can promote Members to Organizer, or move Organizers back to Member."}
          {" "}Use <strong>Reset</strong> to give a member who&apos;s locked out a temporary password.
        </p>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Change role</th><th>Password</th></tr></thead>
            <tbody>
              {users.map((u) => {
                const banned = bannedEmails.has(u.email);
                const options = banned ? [] : assignableRoles(me, u);
                return (
                  <tr key={u.id}>
                    <td>{u.name}{u.id === me.id && <span className="muted"> (you)</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      {banned
                        ? <span className="role-badge role-BANNED">Banned</span>
                        : <span className={`role-badge role-${u.role}`}>{ROLE_LABELS[u.role as Role]}</span>}
                    </td>
                    <td>
                      {options.length ? (
                        <ActionForm action={setUserRole.bind(null, u.id)} className="inline-form"
                          submitLabel="Update" pendingLabel="…" buttonClassName="btn btn-ghost btn-sm">
                          <select name="role" defaultValue={u.role} aria-label={`Role for ${u.name}`}>
                            {options.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                          </select>
                        </ActionForm>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      {!banned && canBan(me, u) ? (
                        <details className="reset-pw">
                          <summary>Reset</summary>
                          <ActionForm action={resetUserPassword.bind(null, u.id)} className="inline-form"
                            submitLabel="Generate temporary password" pendingLabel="…" buttonClassName="btn btn-ghost btn-sm">
                            <span className="muted">Signs {u.name} out everywhere.</span>
                          </ActionForm>
                        </details>
                      ) : <span className="muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="bans" className="panel">
        <h2>Banned users</h2>
        <p className="muted">
          A banned email is signed out everywhere and can&apos;t sign in or create an account. You can ban
          an email before anyone signs up with it. Banning an Organizer or Admin also drops them to Member
          and cancels their RSVPs to upcoming events.
          {me.role === "OWNER" ? " Nobody can ban you." : " Only the Owner can ban an Admin."}
        </p>
        <ActionForm action={banEmail} submitLabel="Ban email" pendingLabel="Banning…" buttonClassName="btn btn-danger" resetOnSuccess>
          <div className="form-row">
            <label>Email<input type="email" name="email" required autoComplete="off" /></label>
            <label>Reason <span className="muted">(optional, only Admins see it)</span>
              <input name="reason" maxLength={500} placeholder="e.g. Guideline 1, repeated" />
            </label>
          </div>
        </ActionForm>
        {bans.length > 0 && (
          <div className="table-wrap" style={{ marginTop: 24 }}>
            <table>
              <thead><tr><th>Email</th><th>Reason</th><th>Banned by</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {bans.map((b) => (
                  <tr key={b.email}>
                    <td>
                      {b.email}
                      {nameByEmail.has(b.email) && <div className="muted">{nameByEmail.get(b.email)}</div>}
                    </td>
                    <td>{b.reason ?? <span className="muted">—</span>}</td>
                    <td>{b.bannedBy?.name ?? <span className="muted">—</span>}</td>
                    <td>{b.createdAt.toLocaleDateString("en-US", { timeZone: "America/New_York", dateStyle: "medium" })}</td>
                    <td><ConfirmButton action={unbanEmail.bind(null, b.email)} label="Unban" confirmLabel="Yes, unban" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {me.role === "OWNER" && (
        <section id="ownership" className="panel danger-zone">
          <h2>Transfer ownership</h2>
          <p>
            Hand the Owner role to another member. They must already have an account.
            You will become an Admin, and only the new Owner can undo this.
          </p>
          <ActionForm action={transferOwnership} submitLabel="Transfer ownership" buttonClassName="btn btn-danger"
            pendingLabel="Transferring…" autoComplete="off">
            <TransferOwnershipFields />
          </ActionForm>
        </section>
      )}
    </div>
  );
}
