import { describe, expect, it } from "vitest";
import { detectAssetFileMime, validateAssetUpload } from "@/shared/uploads/validate-asset-file";

describe("validateAssetUpload", () => {
  it("accepts PNG magic bytes", () => {
    const buffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    const file = { size: buffer.length } as File;
    expect(detectAssetFileMime(buffer)).toBe("image/png");
    expect(validateAssetUpload(file, buffer).extension).toBe("png");
  });

  it("rejects unknown file types", () => {
    const buffer = Buffer.from("plain-text");
    const file = { size: buffer.length } as File;
    expect(detectAssetFileMime(buffer)).toBeNull();
    expect(() => validateAssetUpload(file, buffer)).toThrowError(/Unsupported file type/i);
  });
});
