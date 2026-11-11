import { expect, test } from "bun:test";
import {
  canAccessAdmin,
  canManageRoles,
  canModerate,
  isProfileComplete,
  isRankedRole,
  isRole,
  LEADERBOARD_EXCLUDED_ROLES,
  ROLES,
} from "./roles";

test("admin tiers can access admin, member / alumni / ajiet_student cannot", () => {
  expect(canAccessAdmin("president")).toBe(true);
  expect(canAccessAdmin("vice_president")).toBe(true);
  expect(canAccessAdmin("core_member")).toBe(true);
  expect(canAccessAdmin("faculty")).toBe(true);
  expect(canAccessAdmin("member")).toBe(false);
  expect(canAccessAdmin("alumni")).toBe(false);
  expect(canAccessAdmin("ajiet_student")).toBe(false);
});

test("canAccessAdmin rejects nullish / unknown", () => {
  expect(canAccessAdmin(null)).toBe(false);
  expect(canAccessAdmin(undefined)).toBe(false);
  expect(canAccessAdmin("admin")).toBe(false); // legacy value gone
});

test("only president can manage roles", () => {
  expect(canManageRoles("president")).toBe(true);
  expect(canManageRoles("vice_president")).toBe(false);
  expect(canManageRoles("core_member")).toBe(false);
  expect(canManageRoles("faculty")).toBe(false);
  expect(canManageRoles("member")).toBe(false);
  expect(canManageRoles(null)).toBe(false);
});

test("isRole narrows valid values only", () => {
  expect(isRole("president")).toBe(true);
  expect(isRole("member")).toBe(true);
  expect(isRole("ajiet_student")).toBe(true);
  expect(isRole("admin")).toBe(false);
  expect(isRole(42)).toBe(false);
});

test("ROLES lists all seven tiers in priority order", () => {
  expect(ROLES).toEqual([
    "president",
    "vice_president",
    "faculty",
    "core_member",
    "member",
    "alumni",
    "ajiet_student",
  ]);
});

test("canModerate: lower tiers cannot touch the officers above them", () => {
  expect(canModerate("core_member", "president")).toBe(false);
  expect(canModerate("core_member", "vice_president")).toBe(false);
  expect(canModerate("vice_president", "president")).toBe(false);
  expect(canModerate("vice_president", "vice_president")).toBe(false);
});

test("canModerate: officers moderate those below; anyone moderates members", () => {
  expect(canModerate("president", "vice_president")).toBe(true);
  expect(canModerate("president", "core_member")).toBe(true);
  expect(canModerate("vice_president", "core_member")).toBe(true);
  expect(canModerate("core_member", "core_member")).toBe(true);
  expect(canModerate("core_member", "ajiet_student")).toBe(true);
});

test("canModerate: non-admins moderate nobody", () => {
  expect(canModerate("member", "ajiet_student")).toBe(false);
  expect(canModerate(undefined, "member")).toBe(false);
});

test("alumni and faculty stay off the leaderboard, every other tier is ranked", () => {
  expect(LEADERBOARD_EXCLUDED_ROLES).toEqual(["alumni", "faculty"]);
  for (const role of ROLES) {
    expect(isRankedRole(role)).toBe(role !== "alumni" && role !== "faculty");
  }
});

test("canModerate: only the President moderates faculty", () => {
  expect(canModerate("president", "faculty")).toBe(true);
  expect(canModerate("vice_president", "faculty")).toBe(false);
  expect(canModerate("faculty", "faculty")).toBe(false);
  expect(canModerate("core_member", "faculty")).toBe(false);
});

test("canModerate: faculty moderate core members and below, not officers", () => {
  expect(canModerate("faculty", "president")).toBe(false);
  expect(canModerate("faculty", "vice_president")).toBe(false);
  expect(canModerate("faculty", "core_member")).toBe(true);
  expect(canModerate("faculty", "member")).toBe(true);
  expect(canModerate("faculty", "ajiet_student")).toBe(true);
});

test("isProfileComplete: students need USN + branch + LeetCode", () => {
  const full = { usn: "4JK24CS001", branch: "CSE", lcUsername: "lc" };
  expect(isProfileComplete({ role: "member", ...full })).toBe(true);
  expect(isProfileComplete({ role: "member", ...full, usn: null })).toBe(false);
  expect(isProfileComplete({ role: "member", ...full, lcUsername: null })).toBe(
    false,
  );
  expect(isProfileComplete({ ...full, branch: "" })).toBe(false);
});

test("isProfileComplete: faculty need only a department", () => {
  expect(isProfileComplete({ role: "faculty", branch: "MBA" })).toBe(true);
  expect(isProfileComplete({ role: "faculty", branch: null })).toBe(false);
});
