import { describe, expect, test } from "bun:test";
import { coalesce } from "./coalesce";

const tick = () => new Promise((r) => setTimeout(r, 5));

describe("coalesce", () => {
  test("a burst runs once plus one trailing run", async () => {
    let runs = 0;
    const run = coalesce(async () => {
      runs++;
      await tick();
    });
    await Promise.all(Array.from({ length: 50 }, () => run()));
    expect(runs).toBe(2);
  });

  test("a single call runs once", async () => {
    let runs = 0;
    const run = coalesce(async () => {
      runs++;
    });
    await run();
    expect(runs).toBe(1);
  });

  test("calls after a run finishes start a fresh run", async () => {
    let runs = 0;
    const run = coalesce(async () => {
      runs++;
      await tick();
    });
    await run();
    await run();
    expect(runs).toBe(2);
  });

  test("errors are reported, never thrown, and don't wedge it", async () => {
    const errors: unknown[] = [];
    let runs = 0;
    const run = coalesce(
      async () => {
        runs++;
        throw new Error("boom");
      },
      (e) => errors.push(e),
    );
    await run();
    await run();
    expect(runs).toBe(2);
    expect(errors).toHaveLength(2);
  });
});
