// Role hierarchy. Each role includes every ability of the roles below it.
export const ROLES = ["USER", "ORGANIZER", "ADMIN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  USER: "Member",
  ORGANIZER: "Organizer",
  ADMIN: "Admin",
  OWNER: "Owner",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function rank(role: string): number {
  return ROLES.indexOf(role as Role);
}

export function hasRole(user: { role: string } | null | undefined, minimum: Role): boolean {
  return !!user && rank(user.role) >= rank(minimum);
}

/**
 * Which roles can `actor` assign to `target`?
 * - Nobody can change the Owner's role (ownership moves only via transfer).
 * - The Owner can set anyone else to Member, Organizer, or Admin.
 * - Admins can move Members and Organizers between those two roles,
 *   and cannot touch other Admins.
 */
/**
 * Can `actor` ban `target` (an existing account, or null for an email with no account)?
 * Same reach as role changes: never yourself or the Owner, and Admins can't ban other Admins.
 */
export function canBan(actor: { id: string; role: string }, target: { id: string; role: string } | null): boolean {
  if (rank(actor.role) < rank("ADMIN")) return false;
  return !target || assignableRoles(actor, target).length > 0;
}

export function assignableRoles(actor: { id: string; role: string }, target: { id: string; role: string }): Role[] {
  if (actor.id === target.id || target.role === "OWNER") return [];
  if (actor.role === "OWNER") return ["USER", "ORGANIZER", "ADMIN"];
  if (actor.role === "ADMIN" && rank(target.role) < rank("ADMIN")) return ["USER", "ORGANIZER"];
  return [];
}
