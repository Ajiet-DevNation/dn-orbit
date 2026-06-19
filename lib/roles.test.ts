import { test, expect } from "bun:test";
import { canAccessAdmin, canManageRoles, isRole, ROLES } from "./roles";

test("admin tiers can access admin, member / ajiet_student cannot", () => {
  expect(canAccessAdmin("president")).toBe(true);
  expect(canAccessAdmin("vice_president")).toBe(true);
  expect(canAccessAdmin("core_member")).toBe(true);
  expect(canAccessAdmin("member")).toBe(false);
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

test("ROLES lists all five tiers", () => {
  expect(ROLES).toEqual([
    "president",
    "vice_president",
    "core_member",
    "member",
    "ajiet_student",
  ]);
});
