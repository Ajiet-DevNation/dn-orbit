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
const cronSecret =
  readFlag("--cron-secret") || process.env.API_TEST_CRON_SECRET || process.env.CRON_SECRET || "";

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
  return [
    { name: "auth session", method: "GET", path: "/api/auth/session", expected: [200] },
    {
      name: "events list unauth",
      method: "GET",
      path: "/api/events",
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "projects list unauth",
      method: "GET",
      path: "/api/projects",
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "event detail missing unauth",
      method: "GET",
      path: `/api/events/${missingId}`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "project detail missing unauth",
      method: "GET",
      path: `/api/projects/${missingId}`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "event register unauth",
      method: "POST",
      path: `/api/events/${missingId}/register`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "event feedback post unauth",
      method: "POST",
      path: `/api/events/${missingId}/feedback`,
      body: { rating: 5, comments: "test" },
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "event feedback get unauth",
      method: "GET",
      path: `/api/events/${missingId}/feedback`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "event attendance unauth",
      method: "GET",
      path: `/api/events/${missingId}/attendance`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "admin weights unauth",
      method: "GET",
      path: "/api/admin/config/weights",
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "admin member patch unauth",
      method: "PATCH",
      path: `/api/admin/members/${missingId}`,
      body: { bio: "x" },
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "admin refresh unauth",
      method: "POST",
      path: `/api/admin/members/${missingId}/refresh`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "stats github unauth",
      method: "GET",
      path: `/api/stats/github/${missingId}`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "stats lc unauth",
      method: "GET",
      path: `/api/stats/lc/${missingId}`,
      expected: [307, 302],
      expectLocationContains: "/login",
    },
    {
      name: "cron without secret",
      method: "GET",
      path: "/api/cron/leaderboard",
      expected: [307, 302],
      expectLocationContains: "/login",
    },
  ];
}

function makeMemberTests() {
  return [
    { name: "session with member cookie", method: "GET", path: "/api/auth/session", expected: [200], cookie: memberCookie },
    { name: "admin weights as member", method: "GET", path: "/api/admin/config/weights", expected: [403], cookie: memberCookie },
    { name: "event register missing", method: "POST", path: `/api/events/${missingId}/register`, expected: [404], cookie: memberCookie },
    {
      name: "event feedback missing",
      method: "POST",
      path: `/api/events/${missingId}/feedback`,
      body: { rating: 4, comments: "test" },
      expected: [404],
      cookie: memberCookie,
    },
    { name: "attendance as member forbidden", method: "GET", path: `/api/events/${missingId}/attendance`, expected: [403], cookie: memberCookie },
  ];
}

function makeAdminTests() {
  const tests = [
    { name: "session with admin cookie", method: "GET", path: "/api/auth/session", expected: [200], cookie: adminCookie },
    { name: "admin weights get", method: "GET", path: "/api/admin/config/weights", expected: [200], cookie: adminCookie },
    {
      name: "admin weights patch validation",
      method: "PATCH",
      path: "/api/admin/config/weights",
      body: { githubWeight: "bad", lcWeight: 0.3, eventWeight: 0.3 },
      expected: [400],
      cookie: adminCookie,
    },
    { name: "attendance list as admin", method: "GET", path: `/api/events/${missingId}/attendance`, expected: [200], cookie: adminCookie },
    { name: "feedback list as admin", method: "GET", path: `/api/events/${missingId}/feedback`, expected: [200], cookie: adminCookie },
    { name: "admin refresh member cache", method: "POST", path: `/api/admin/members/${missingId}/refresh`, expected: [200], cookie: adminCookie },
    {
      name: "admin patch member validation",
      method: "PATCH",
      path: `/api/admin/members/${missingId}`,
      body: {},
      expected: [400],
      cookie: adminCookie,
    },
  ];

  if (cronSecret) {
    tests.push({
      name: "cron with secret",
      method: "GET",
      path: "/api/cron/leaderboard",
      expected: [200],
      headers: { authorization: `Bearer ${cronSecret}` },
    });
  }

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
        ? !!result.location && result.location.includes(test.expectLocationContains)
        : true;
      const ok = statusOk && locationOk;
      if (ok) {
        passed += 1;
        console.log(`PASS ${test.method} ${test.path} -> ${result.status} (${test.name})`);
      } else {
        failed += 1;
        console.log(
          `FAIL ${test.method} ${test.path} -> ${result.status}, expected ${test.expected.join("/")} (${test.name})`
        );
        if (test.expectLocationContains) {
          console.log(
            `  location: ${result.location || "<none>"}, expected contains ${test.expectLocationContains}`
          );
        }
        console.log(`  payload: ${formatPayload(result.payload)}`);
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`FAIL ${test.method} ${test.path} -> request error (${test.name})`);
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
    console.log("\n[Member Cookie] skipped (set API_TEST_MEMBER_COOKIE or --member-cookie)");
  }

  if (adminCookie) {
    const admin = await runTests("Admin Cookie", makeAdminTests());
    totalPassed += admin.passed;
    totalFailed += admin.failed;
  } else {
    console.log("[Admin Cookie] skipped (set API_TEST_ADMIN_COOKIE or --admin-cookie)");
  }

  console.log("\nSummary");
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    process.exitCode = 1;
  }
}

main();
