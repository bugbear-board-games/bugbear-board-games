import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { EDITABLE_CONTENT, getSiteContent } from "@/lib/content";
import { assignableRoles, canBan, rank, ROLE_LABELS, type Role } from "@/lib/roles";
import { banEmail, deleteLeader, resetUserPassword, saveLeader, setUserRole, transferOwnership, unbanEmail, updateSiteContent } from "@/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmButton } from "@/components/ConfirmButton";

export const metadata: Metadata = { title: "Admin" };

type Leader = { id: string; name: string; title: string; email: string | null; phone: string | null; sortOrder: number };

function LeaderFields({ leader }: { leader?: Leader }) {
  return (
    <>
      {leader && <input type="hidden" name="id" value={leader.id} />}
      <div className="form-row">
        <label>Name<input name="name" required defaultValue={leader?.name} /></label>
        <label>Title<input name="title" required defaultValue={leader?.title} placeholder="President" /></label>
      </div>
      <div className="form-row">
        <label>Email<input type="email" name="email" defaultValue={leader?.email ?? ""} /></label>
        <label>Phone<input type="tel" name="phone" defaultValue={leader?.phone ?? ""} /></label>
        <label>Display order<input type="number" name="sortOrder" defaultValue={leader?.sortOrder ?? 0} /></label>
      </div>
    </>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ transferred?: string }> }) {
  const me = await requireRole("ADMIN");
  const { transferred } = await searchParams;
  const [content, leaders, users, bans] = await Promise.all([
    getSiteContent(),
    db.leadershipContact.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    db.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    db.ban.findMany({ orderBy: { createdAt: "desc" }, include: { bannedBy: { select: { name: true } } } }),
  ]);
  const bannedEmails = new Set(bans.map((b) => b.email));
  const nameByEmail = new Map(users.map((u) => [u.email, u.name]));
  users.sort((a, b) => rank(b.role) - rank(a.role) || a.name.localeCompare(b.name));

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
                ? <textarea name={c.key} rows={c.key === "guidelines" ? 12 : 6} required defaultValue={content[c.key]} />
                : <input name={c.key} required defaultValue={content[c.key]} />}
              {c.hint && <span className="muted field-hint">{c.hint}</span>}
            </label>
          ))}
        </ActionForm>
      </section>

      <section id="leadership" className="panel">
        <h2>Leadership contacts</h2>
        {leaders.length === 0 && <p className="muted">No contacts yet. Add one below.</p>}
        {leaders.map((l) => (
          <details key={l.id} className="leader-edit">
            <summary>{l.name}: {l.title}</summary>
            <div style={{ marginTop: 16 }}>
              <ActionForm action={saveLeader} submitLabel="Save contact"><LeaderFields leader={l} /></ActionForm>
              <div style={{ marginTop: 12 }}>
                <ConfirmButton action={deleteLeader.bind(null, l.id)} label="Remove contact" confirmLabel="Yes, remove" />
              </div>
            </div>
          </details>
        ))}
        <div className="leader-edit">
          <h3>Add a contact</h3>
          <ActionForm action={saveLeader} submitLabel="Add contact" resetOnSuccess><LeaderFields /></ActionForm>
        </div>
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
          <ActionForm action={transferOwnership} submitLabel="Transfer ownership" buttonClassName="btn btn-danger" pendingLabel="Transferring…">
            <label>New owner&apos;s email<input type="email" name="email" required /></label>
            <label>Your password<input type="password" name="password" autoComplete="current-password" required /></label>
            <label><span>Type <code>TRANSFER</code> to confirm</span><input name="confirm" required autoComplete="off" /></label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
