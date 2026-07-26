import { beforeEach, describe, expect, test } from "bun:test";
import {
  __resetBootSplash,
  isBootSplashDone,
  markBootSplashDone,
  onBootSplashDone,
} from "./boot-splash";

beforeEach(() => {
  __resetBootSplash();
});

describe("boot splash coordination", () => {
  test("starts undone", () => {
    expect(isBootSplashDone()).toBe(false);
  });

  test("a waiter registered before completion fires on completion", () => {
    let fired = 0;
    onBootSplashDone(() => {
      fired++;
    });
    expect(fired).toBe(0);
    markBootSplashDone();
    expect(fired).toBe(1);
  });

  test("a waiter registered AFTER completion fires immediately", () => {
    // The case that a bare event listener gets wrong: on a soft navigation the
    // splash lives in the persistent layout and never replays, so a hero
    // mounting later would otherwise wait forever.
    markBootSplashDone();
    let fired = 0;
    onBootSplashDone(() => {
      fired++;
    });
    expect(fired).toBe(1);
  });

  test("marking twice only notifies once", () => {
    let fired = 0;
    onBootSplashDone(() => {
      fired++;
    });
    markBootSplashDone();
    markBootSplashDone();
    expect(fired).toBe(1);
  });

  test("several waiters all fire", () => {
    let a = 0;
    let b = 0;
    onBootSplashDone(() => {
      a++;
    });
    onBootSplashDone(() => {
      b++;
    });
    markBootSplashDone();
    expect(a).toBe(1);
    expect(b).toBe(1);
  });

  test("cleanup stops a waiter from firing", () => {
    let fired = 0;
    const cancel = onBootSplashDone(() => {
      fired++;
    });
    cancel();
    markBootSplashDone();
    expect(fired).toBe(0);
  });

  test("cleanup after an immediate fire is safe", () => {
    markBootSplashDone();
    const cancel = onBootSplashDone(() => {});
    expect(() => cancel()).not.toThrow();
  });

  test("the fallback runs the callback if the splash never reports", async () => {
    // Safety net: a hero on a route without the splash, or a load event that
    // never fires, must still get its animation.
    let fired = 0;
    onBootSplashDone(() => {
      fired++;
    }, 10);
    expect(fired).toBe(0);
    await new Promise((r) => setTimeout(r, 30));
    expect(fired).toBe(1);
  });

  test("the fallback does not double-fire after a real completion", async () => {
    let fired = 0;
    onBootSplashDone(() => {
      fired++;
    }, 10);
    markBootSplashDone();
    await new Promise((r) => setTimeout(r, 30));
    expect(fired).toBe(1);
  });

  test("isBootSplashDone latches", () => {
    markBootSplashDone();
    expect(isBootSplashDone()).toBe(true);
  });
});
