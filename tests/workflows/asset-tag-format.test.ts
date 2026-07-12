import { describe, expect, it } from "vitest";
import { formatAssetTag } from "@/modules/asset/repositories/asset.repository";

describe("formatAssetTag", () => {
  it("formats single-digit sequence as AF-000001", () => {
    expect(formatAssetTag(1)).toBe("AF-000001");
  });

  it("formats double-digit sequence as AF-000010", () => {
    expect(formatAssetTag(10)).toBe("AF-000010");
  });

  it("formats large sequence values", () => {
    expect(formatAssetTag(114)).toBe("AF-000114");
  });
});
