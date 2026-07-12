import { describe, expect, it } from "vitest";
import { AssetStateMachine } from "@/modules/asset/domain/asset-state-machine";
import { AppError } from "@/shared/errors/app-error";

describe("AssetStateMachine", () => {
  it("allows AVAILABLE to ALLOCATED", () => {
    expect(AssetStateMachine.canTransition("AVAILABLE", "ALLOCATED")).toBe(true);
  });

  it("allows ALLOCATED to AVAILABLE", () => {
    expect(AssetStateMachine.canTransition("ALLOCATED", "AVAILABLE")).toBe(true);
  });

  it("allows ALLOCATED to UNDER_MAINTENANCE", () => {
    expect(
      AssetStateMachine.canTransition("ALLOCATED", "UNDER_MAINTENANCE")
    ).toBe(true);
  });

  it("allows AVAILABLE to RESERVED", () => {
    expect(AssetStateMachine.canTransition("AVAILABLE", "RESERVED")).toBe(true);
  });

  it("allows RESERVED to AVAILABLE", () => {
    expect(AssetStateMachine.canTransition("RESERVED", "AVAILABLE")).toBe(true);
  });

  it("allows LOST to RETIRED", () => {
    expect(AssetStateMachine.canTransition("LOST", "RETIRED")).toBe(true);
  });

  it("rejects RETIRED to any status", () => {
    expect(AssetStateMachine.canTransition("RETIRED", "AVAILABLE")).toBe(false);
    expect(AssetStateMachine.canTransition("RETIRED", "DISPOSED")).toBe(false);
  });

  it("rejects DISPOSED to any status", () => {
    expect(AssetStateMachine.canTransition("DISPOSED", "AVAILABLE")).toBe(
      false
    );
  });

  it("rejects ALLOCATED to RESERVED", () => {
    expect(AssetStateMachine.canTransition("ALLOCATED", "RESERVED")).toBe(
      false
    );
  });

  it("assertTransition throws ASSET_003 on invalid transition", () => {
    expect(() =>
      AssetStateMachine.assertTransition("RETIRED", "AVAILABLE")
    ).toThrow(AppError);
    try {
      AssetStateMachine.assertTransition("RETIRED", "AVAILABLE");
    } catch (e) {
      expect((e as AppError).code).toBe("ASSET_003");
    }
  });

  it("assertTransition passes on same status", () => {
    expect(() =>
      AssetStateMachine.assertTransition("AVAILABLE", "AVAILABLE")
    ).not.toThrow();
  });
});
