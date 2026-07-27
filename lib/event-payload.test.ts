import { describe, expect, test } from "bun:test";
import { eventCreateData, eventUpdateData } from "./event-payload";
import { createEventSchema, updateEventSchema } from "./validation";

// Payloads are built from schema output, so the fixtures go through the real
// schemas rather than hand-shaped objects that could drift from them.
function created(body: unknown) {
  return createEventSchema.parse(body);
}
function updated(body: unknown) {
  return updateEventSchema.parse(body);
}

const MINIMAL = { title: "Hack Night", eventDate: "2026-08-01T18:30" };

describe("eventCreateData", () => {
  test("always enters the moderation queue", () => {
    const data = eventCreateData(created(MINIMAL), {
      userId: "u1",
      isAdmin: true,
    });
    expect(data.reviewStatus).toBe("pending");
  });

  test("a non-admin cannot self-publish, even asking explicitly", () => {
    const data = eventCreateData(created({ ...MINIMAL, isPublished: true }), {
      userId: "u1",
      isAdmin: false,
    });
    expect(data.isPublished).toBe(false);
  });

  test("an admin may publish immediately", () => {
    const data = eventCreateData(created({ ...MINIMAL, isPublished: true }), {
      userId: "u1",
      isAdmin: true,
    });
    expect(data.isPublished).toBe(true);
  });

  test("defaults audience to public and leaves caps unset", () => {
    const data = eventCreateData(created(MINIMAL), {
      userId: "u1",
      isAdmin: false,
    });
    expect(data.audience).toBe("public");
    expect(data.capacity).toBeNull();
    expect(data.registrationDeadline).toBeNull();
  });

  test("stamps the creator", () => {
    const data = eventCreateData(created(MINIMAL), {
      userId: "u-42",
      isAdmin: false,
    });
    expect(data.createdBy).toBe("u-42");
  });
});

describe("eventUpdateData", () => {
  test("omits every field the caller did not send", () => {
    const data = eventUpdateData(updated({ isPublished: true }));
    expect(Object.keys(data)).toEqual(["isPublished"]);
  });

  test("does not clobber a title that was never mentioned", () => {
    const data = eventUpdateData(updated({ location: "Lab 2" }));
    expect(data).not.toHaveProperty("title");
  });

  test("carries through the fields that are present", () => {
    const data = eventUpdateData(
      updated({ title: "Renamed", capacity: 50, audience: "members" }),
    );
    expect(data.title).toBe("Renamed");
    expect(data.capacity).toBe(50);
    expect(data.audience).toBe("members");
  });

  test("an explicit null still clears a nullable column", () => {
    const data = eventUpdateData(updated({ capacity: null }));
    expect(data).toHaveProperty("capacity");
    expect(data.capacity).toBeNull();
  });

  test("an empty patch produces an empty payload", () => {
    expect(Object.keys(eventUpdateData(updated({})))).toEqual([]);
  });
});
