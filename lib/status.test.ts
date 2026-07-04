import { expect, test } from "bun:test";
import { APPROVAL_STATUSES, isApprovalStatus, STATUS_LABELS } from "./status";

test("APPROVAL_STATUSES lists the three states", () => {
  expect(APPROVAL_STATUSES).toEqual(["pending", "approved", "rejected"]);
});

test("isApprovalStatus narrows valid values only", () => {
  expect(isApprovalStatus("pending")).toBe(true);
  expect(isApprovalStatus("approved")).toBe(true);
  expect(isApprovalStatus("rejected")).toBe(true);
  expect(isApprovalStatus("banned")).toBe(false);
  expect(isApprovalStatus(7)).toBe(false);
});

test("STATUS_LABELS has a label per status", () => {
  expect(STATUS_LABELS.pending).toBe("Pending");
  expect(STATUS_LABELS.approved).toBe("Approved");
  expect(STATUS_LABELS.rejected).toBe("Rejected");
});
