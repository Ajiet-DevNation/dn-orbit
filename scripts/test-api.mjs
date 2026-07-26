#!/usr/bin/env node

const args = process.argv.slice(2);

function readFlag(name) {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  return undefined;
}

const baseUrl =
  readFlag("--base-url") ||
  process.env.API_TEST_BASE_URL ||
  "http://localhost:3000";

const memberCookie =
  readFlag("--member-cookie") || process.env.API_TEST_MEMBER_COOKIE || "";
const adminCookie =
  readFlag("--admin-cookie") || process.env.API_TEST_ADMIN_COOKIE || "";
const missingId = "00000000-0000-0000-0000-000000000000";

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const headers = {
    "content-type": "application/json",
    ...(options.headers || {}),
  };

  if (options.cookie) {
    headers.cookie = options.cookie;
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual",
  });

  let payload;
  const text = await response.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  return {
    status: response.status,
    location: response.headers.get("location"),
    payload,
  };
}

function formatPayload(payload) {
  if (payload == null) return "";
  if (typeof payload === "string") return payload.slice(0, 120);
  try {
    return JSON.stringify(payload).slice(0, 120);
  } catch {
    return "[unserializable payload]";
  }
}

function makeUnauthTests() {
  // These previously all asserted a 302/307 to /login. Nothing ever produced
  // that: proxy.ts only guards /onboarding and /admin, so every /api/** route
  // is reached directly and answers for itself. The expectations below are the
  // real contract, which makes this file a genuine authz regression check.
  return [
    {
      name: "auth session",
      method: "GET",
      path: "/api/auth/session",
      expected: [200],
    },
    {
      // Public listings: approved + published rows only, no moderation columns.
      name: "events list unauth is public",
      method: "GET",
      path: "/api/events",
      expected: [200],
    },
    {
      name: "projects list unauth is public",
      method: "GET",
      path: "/api/projects",
      expected: [200],
    },
    {
      // Unknown/unpublished events 404 rather than 403 — a 403 would confirm
      // the id exists.
      name: "event detail missing unauth",
      method: "GET",
      path: `/api/events/${missingId}`,
      expected: [404],
    },
    {
      name: "project detail missing unauth",
      method: "GET",
      path: `/api/projects/${missingId}`,
      expected: [404],
    },
    {
      // Event lookup runs before the auth branch, so a missing event 404s.
      name: "event register unauth",
      method: "POST",
      path: `/api/events/${missingId}/register`,
      expected: [404],
    },
    {
      name: "event feedback post unauth",
      method: "POST",
      path: `/api/events/${missingId}/feedback`,
      body: { rating: 5, comments: "test" },
      expected: [401],
    },
    {
      // Checks the session before the role, so anonymous gets 401 (a signed-in
      // non-admin is the one who gets 403 — see makeMemberTests).
      name: "event feedback get unauth",
      method: "GET",
      path: `/api/events/${missingId}/feedback`,
      expected: [401],
    },
    {
      // No GET handler exists on attendance — Next answers 405.
      name: "event attendance unauth",
      method: "GET",
      path: `/api/events/${missingId}/attendance`,
      expected: [405],
    },
    {
      name: "admin weights unauth",
      method: "GET",
      path: "/api/admin/config/weights",
      expected: [403],
    },
    {
      name: "admin member patch unauth",
      method: "PATCH",
      path: `/api/admin/members/${missingId}`,
      body: { bio: "x" },
      expected: [403],
    },
    {
      name: "admin refresh unauth",
      method: "POST",
      path: `/api/admin/members/${missingId}/refresh`,
      expected: [403],
    },
    {
      name: "stats github unauth",
      method: "GET",
      path: `/api/stats/github/${missingId}`,
      expected: [401],
    },
    {
      name: "stats lc unauth",
      method: "GET",
      path: `/api/stats/lc/${missingId}`,
      expected: [401],
    },
    {
      // Regression guard for the fixed disclosure: this route used to return
      // every registration (userId, attended, registeredAt) and every feedback
      // row to any anonymous caller holding an event id.
      name: "event detail never exposes roster or feedback to anonymous callers",
      method: "GET",
      path: `/api/events/${missingId}`,
      expected: [404],
      expectBodyExcludes: ["registrations", "feedback"],
    },
    {
      // Cross-site callers can't drive the sync trigger.
      name: "sync trigger rejects a cross-origin caller",
      method: "POST",
      path: "/api/sync",
      headers: { origin: "https://evil.example" },
      expected: [403],
    },
    {
      // Self-throttling by design: a stale-check + DB lock bound the work, so
      // anonymous calls are expected to succeed (typically "fresh"/"locked").
      name: "on-visit sync trigger",
      method: "POST",
      path: "/api/sync",
      expected: [202],
    },
  ];
}

function makeMemberTests() {
  return [
    {
      name: "session with member cookie",
      method: "GET",
      path: "/api/auth/session",
      expected: [200],
      cookie: memberCookie,
    },
    {
      name: "admin weights as member",
      method: "GET",
      path: "/api/admin/config/weights",
      expected: [403],
      cookie: memberCookie,
    },
    {
      name: "event register missing",
      method: "POST",
      path: `/api/events/${missingId}/register`,
      expected: [404],
      cookie: memberCookie,
    },
    {
      name: "event feedback missing",
      method: "POST",
      path: `/api/events/${missingId}/feedback`,
      body: { rating: 4, comments: "test" },
      expected: [404],
      cookie: memberCookie,
    },
    {
      name: "attendance as member forbidden",
      method: "GET",
      path: `/api/events/${missingId}/attendance`,
      expected: [403],
      cookie: memberCookie,
    },
  ];
}

function makeAdminTests() {
  const tests = [
    {
      name: "session with admin cookie",
      method: "GET",
      path: "/api/auth/session",
      expected: [200],
      cookie: adminCookie,
    },
    {
      name: "admin weights get",
      method: "GET",
      path: "/api/admin/config/weights",
      expected: [200],
      cookie: adminCookie,
    },
    {
      name: "admin weights patch validation",
      method: "PATCH",
      path: "/api/admin/config/weights",
      body: { githubWeight: "bad", lcWeight: 0.3, eventWeight: 0.3 },
      expected: [400],
      cookie: adminCookie,
    },
    {
      name: "attendance list as admin",
      method: "GET",
      path: `/api/events/${missingId}/attendance`,
      expected: [200],
      cookie: adminCookie,
    },
    {
      name: "feedback list as admin",
      method: "GET",
      path: `/api/events/${missingId}/feedback`,
      expected: [200],
      cookie: adminCookie,
    },
    {
      name: "admin refresh member cache",
      method: "POST",
      path: `/api/admin/members/${missingId}/refresh`,
      expected: [200],
      cookie: adminCookie,
    },
    {
      name: "admin patch member validation",
      method: "PATCH",
      path: `/api/admin/members/${missingId}`,
      body: {},
      expected: [400],
      cookie: adminCookie,
    },
  ];

  return tests;
}

async function runTests(label, tests) {
  let passed = 0;
  let failed = 0;

  if (!tests.length) {
    return { passed, failed };
  }

  console.log(`\n[${label}]`);

  for (const test of tests) {
    try {
      const result = await request(test.path, {
        method: test.method,
        body: test.body,
        headers: test.headers,
        cookie: test.cookie,
      });

      const statusOk = test.expected.includes(result.status);
      const locationOk = test.expectLocationContains
        ? !!result.location &&
          result.location.includes(test.expectLocationContains)
        : true;

      // Guards against a response body ever carrying keys it shouldn't (e.g.
      // an event detail leaking its registration roster). Checked against the
      // serialized body so nested keys are caught too.
      const serialized =
        result.payload == null ? "" : JSON.stringify(result.payload);
      const leaked = (test.expectBodyExcludes || []).filter((key) =>
        serialized.includes(`"${key}"`),
      );
      const bodyOk = leaked.length === 0;

      const ok = statusOk && locationOk && bodyOk;
      if (ok) {
        passed += 1;
        console.log(
          `PASS ${test.method} ${test.path} -> ${result.status} (${test.name})`,
        );
      } else {
        failed += 1;
        console.log(
          `FAIL ${test.method} ${test.path} -> ${result.status}, expected ${test.expected.join("/")} (${test.name})`,
        );
        if (test.expectLocationContains) {
          console.log(
            `  location: ${result.location || "<none>"}, expected contains ${test.expectLocationContains}`,
          );
        }
        if (leaked.length) {
          console.log(`  body leaked disallowed keys: ${leaked.join(", ")}`);
        }
        console.log(`  payload: ${formatPayload(result.payload)}`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(
        `FAIL ${test.method} ${test.path} -> request error (${test.name})`,
      );
      console.log(`  error: ${message}`);
    }
  }

  return { passed, failed };
}

async function main() {
  console.log("API smoke test runner");
  console.log(`Base URL: ${baseUrl}`);

  let totalPassed = 0;
  let totalFailed = 0;

  const unauth = await runTests("Unauthenticated", makeUnauthTests());
  totalPassed += unauth.passed;
  totalFailed += unauth.failed;

  if (memberCookie) {
    const member = await runTests("Member Cookie", makeMemberTests());
    totalPassed += member.passed;
    totalFailed += member.failed;
  } else {
    console.log(
      "\n[Member Cookie] skipped (set API_TEST_MEMBER_COOKIE or --member-cookie)",
    );
  }

  if (adminCookie) {
    const admin = await runTests("Admin Cookie", makeAdminTests());
    totalPassed += admin.passed;
    totalFailed += admin.failed;
  } else {
    console.log(
      "[Admin Cookie] skipped (set API_TEST_ADMIN_COOKIE or --admin-cookie)",
    );
  }

  console.log("\nSummary");
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main();
