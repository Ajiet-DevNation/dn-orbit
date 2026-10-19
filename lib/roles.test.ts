import { expect, test } from "bun:test";
import {
  canAccessAdmin,
  canManageRoles,
  canModerate,
  isRole,
  ROLES,
} from "./roles";

test("admin tiers can access admin, member / alumni / ajiet_student cannot", () => {
  expect(canAccessAdmin("president")).toBe(true);
  expect(canAccessAdmin("vice_president")).toBe(true);
  expect(canAccessAdmin("core_member")).toBe(true);
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

test("ROLES lists all six tiers in priority order", () => {
  expect(ROLES).toEqual([
    "president",
    "vice_president",
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
