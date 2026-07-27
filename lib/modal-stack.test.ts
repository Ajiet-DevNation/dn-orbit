import { beforeEach, describe, expect, test } from "bun:test";
import {
  __resetModalStack,
  isTopModal,
  modalDepth,
  popModal,
  pushModal,
} from "./modal-stack";

beforeEach(() => {
  __resetModalStack();
});

describe("modal stack", () => {
  test("starts empty", () => {
    expect(modalDepth()).toBe(0);
    expect(isTopModal("a")).toBe(false);
  });

  test("tracks depth as modals open and close", () => {
    pushModal("a");
    expect(modalDepth()).toBe(1);
    pushModal("b");
    expect(modalDepth()).toBe(2);
    popModal("b");
    expect(modalDepth()).toBe(1);
    popModal("a");
    expect(modalDepth()).toBe(0);
  });

  test("only the most recently opened modal is top", () => {
    pushModal("profile");
    expect(isTopModal("profile")).toBe(true);

    pushModal("confirm");
    // Escape must close the confirm sheet only, not the profile modal under it.
    expect(isTopModal("confirm")).toBe(true);
    expect(isTopModal("profile")).toBe(false);

    popModal("confirm");
    expect(isTopModal("profile")).toBe(true);
  });

  test("ignores a duplicate push so a re-render cannot double-count", () => {
    pushModal("a");
    pushModal("a");
    expect(modalDepth()).toBe(1);
    popModal("a");
    // A single pop must fully release it — otherwise the body stays locked.
    expect(modalDepth()).toBe(0);
  });

  test("popping an unknown id is a no-op", () => {
    pushModal("a");
    popModal("never-opened");
    expect(modalDepth()).toBe(1);
    expect(isTopModal("a")).toBe(true);
  });

  test("closing out of order leaves the right modal on top", () => {
    pushModal("a");
    pushModal("b");
    pushModal("c");
    // Close the middle one while the top stays open.
    popModal("b");
    expect(modalDepth()).toBe(2);
    expect(isTopModal("c")).toBe(true);

    popModal("c");
    expect(isTopModal("a")).toBe(true);
  });

  test("depth reaches zero only after every modal closes", () => {
    pushModal("a");
    pushModal("b");
    popModal("a");
    // The body must stay locked here — "b" is still open.
    expect(modalDepth()).toBe(1);
    popModal("b");
    expect(modalDepth()).toBe(0);
  });
});
