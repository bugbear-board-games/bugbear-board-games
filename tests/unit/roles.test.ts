import { describe, expect, it } from "vitest";
import { assignableRoles, canBan, hasRole } from "@/lib/roles";

const u = (id: string, role: string) => ({ id, role });
const owner = u("o", "OWNER"), admin = u("a", "ADMIN"), admin2 = u("a2", "ADMIN");
const organizer = u("g", "ORGANIZER"), member = u("m", "USER");

describe("hasRole", () => {
  it("includes every role below", () => {
    expect(hasRole(owner, "ADMIN")).toBe(true);
    expect(hasRole(organizer, "ORGANIZER")).toBe(true);
    expect(hasRole(member, "ORGANIZER")).toBe(false);
    expect(hasRole(null, "USER")).toBe(false);
  });
});

describe("assignableRoles", () => {
  it("Owner can set anyone else to Member, Organizer or Admin", () => {
    expect(assignableRoles(owner, admin)).toEqual(["USER", "ORGANIZER", "ADMIN"]);
  });
  it("Admins move Members and Organizers between those two roles only", () => {
    expect(assignableRoles(admin, member)).toEqual(["USER", "ORGANIZER"]);
    expect(assignableRoles(admin, admin2)).toEqual([]);
  });
  it("nobody changes the Owner or themselves", () => {
    expect(assignableRoles(admin, owner)).toEqual([]);
    expect(assignableRoles(owner, owner)).toEqual([]);
  });
});

// canBan also governs password resets.
describe("canBan", () => {
  it.each([
    ["owner bans admin", owner, admin, true],
    ["owner bans member", owner, member, true],
    ["owner bans self", owner, owner, false],
    ["owner bans an email with no account", owner, null, true],
    ["admin bans organizer", admin, organizer, true],
    ["admin bans an email with no account", admin, null, true],
    ["admin bans another admin", admin, admin2, false],
    ["admin bans owner", admin, owner, false],
    ["admin bans self", admin, admin, false],
    ["organizer bans member", organizer, member, false],
    ["member bans member", member, u("m2", "USER"), false],
  ] as const)("%s", (_name, actor, target, expected) => {
    expect(canBan(actor, target)).toBe(expected);
  });
});
