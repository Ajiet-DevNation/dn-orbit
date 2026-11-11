import { expect, test } from "bun:test";
import { parseProfileForm } from "./profile";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

const student = {
  name: "Asha Rao",
  usn: "4JK24CS069",
  branch: "CSE",
  year: "2",
  lc_username: "asha_rao",
  bio: "  hi  ",
};

test("student form parses and trims", () => {
  const r = parseProfileForm("member", form(student));
  expect(r.ok).toBe(true);
  if (!r.ok || r.faculty) return;
  expect(r.data.year).toBe(2);
  expect(r.data.bio).toBe("hi");
});

test("branch must come from the list, not free text", () => {
  const r = parseProfileForm("member", form({ ...student, branch: "Hacker" }));
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toBe("Select your branch");
});

test("year 5 is refused; MBA year 3 is refused", () => {
  expect(parseProfileForm("member", form({ ...student, year: "5" })).ok).toBe(
    false,
  );
  const r = parseProfileForm(
    "member",
    form({ ...student, branch: "MBA", year: "3" }),
  );
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toContain("MCA and MBA");
});

test("empty bio clears it (null), not 'leave unchanged'", () => {
  const r = parseProfileForm("member", form({ ...student, bio: "" }));
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.data.bio).toBeNull();
});

test("faculty need only name + department; USN / year / LeetCode ignored", () => {
  const r = parseProfileForm(
    "faculty",
    form({ name: "Dr. Rao", branch: "MBA", bio: "" }),
  );
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.faculty).toBe(true);
  expect(r.data).toEqual({ name: "Dr. Rao", branch: "MBA", bio: null });
});

test("faculty still need a valid department", () => {
  const r = parseProfileForm("faculty", form({ name: "Dr. Rao", branch: "" }));
  expect(r.ok).toBe(false);
});

test("a student can't skip USN by claiming the faculty shape", () => {
  const r = parseProfileForm(
    "ajiet_student",
    form({ name: "Asha Rao", branch: "CSE" }),
  );
  expect(r.ok).toBe(false);
});
