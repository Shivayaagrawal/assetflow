import { describe, expect, it } from "vitest";

/**
 * Tests the friendlyError mapping used by OrgSetupClient.
 *
 * We replicate the pure function here because OrgSetupClient is a
 * React client component that cannot be imported in a Node test.
 * If the mapping logic is ever extracted to a shared utility,
 * this test should import it directly instead.
 */

function friendlyError(error: unknown): string {
  if (!(error instanceof Error)) return "Something went wrong. Try again.";
  const msg = error.message;
  if (msg === "ORG_001") return "Department not found or cannot be its own parent.";
  if (msg === "ORG_002") return "A Department Head must be assigned to a department.";
  if (msg === "ORG_003") return "This department still has active employees and cannot be deactivated.";
  if (msg === "ORG_004") return "Cannot deactivate a category with active assets.";
  if (msg === "ORG_005") return "Cannot remove the last admin account.";
  if (msg === "ORG_006") return "Employee not found.";
  if (msg === "FORBIDDEN") return "You do not have permission to perform this action.";
  if (msg === "UNAUTHORIZED") return "Your session expired. Sign in again and retry.";
  if (msg === "AUTH_007") return "You do not have permission to perform this action.";
  if (msg === "AUTH_002") return "Your session expired. Sign in again and retry.";
  if (msg === "AUTH_003") return "Your account is inactive or suspended.";
  if (msg === "GEN_001") return "Validation failed. Check your inputs and try again.";
  return msg || "Something went wrong. Try again.";
}

describe("friendlyError mapping", () => {
  it("maps ORG_001 to a user-friendly message", () => {
    expect(friendlyError(new Error("ORG_001"))).toContain("Department");
  });

  it("maps ORG_002 to department-head-needs-department message", () => {
    expect(friendlyError(new Error("ORG_002"))).toContain("Department Head");
  });

  it("maps ORG_003 to active-employees message", () => {
    expect(friendlyError(new Error("ORG_003"))).toContain("active employees");
  });

  it("maps FORBIDDEN to permission message", () => {
    expect(friendlyError(new Error("FORBIDDEN"))).toContain("permission");
  });

  it("maps UNAUTHORIZED to session expired message", () => {
    expect(friendlyError(new Error("UNAUTHORIZED"))).toContain("session expired");
  });

  it("maps AUTH_007 to permission message (shared error system)", () => {
    expect(friendlyError(new Error("AUTH_007"))).toContain("permission");
  });

  it("maps AUTH_003 to inactive/suspended account message", () => {
    expect(friendlyError(new Error("AUTH_003"))).toContain("inactive or suspended");
  });

  it("maps GEN_001 to validation failed message", () => {
    expect(friendlyError(new Error("GEN_001"))).toContain("Validation failed");
  });

  it("returns generic message for non-Error values", () => {
    expect(friendlyError("string error")).toBe("Something went wrong. Try again.");
    expect(friendlyError(null)).toBe("Something went wrong. Try again.");
    expect(friendlyError(42)).toBe("Something went wrong. Try again.");
  });

  it("returns raw message for unknown error codes", () => {
    expect(friendlyError(new Error("UNKNOWN_CODE_999"))).toBe("UNKNOWN_CODE_999");
  });

  it("returns generic for empty error message", () => {
    expect(friendlyError(new Error(""))).toBe("Something went wrong. Try again.");
  });
});
