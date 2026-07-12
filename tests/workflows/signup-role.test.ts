import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AuthenticationError } from "@/shared/errors/app-error";
import { toSessionUser } from "@/shared/auth/session";

describe("signup role enforcement", () => {
  it("locks role field in Better Auth config", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/auth.ts"), "utf8");
    expect(source).toContain('role: { type: "string", defaultValue: "EMPLOYEE", input: false }');
  });

  it("registers OAuth providers from env helper", () => {
    const source = readFileSync(resolve(process.cwd(), "src/lib/auth.ts"), "utf8");
    expect(source).toContain("getConfiguredSocialProviders");
    expect(source).toContain('ctx.path.startsWith("/callback/")');
  });
});

describe("deactivated user session lookup", () => {
  it("returns AUTH_003 for inactive users", () => {
    expect(() =>
      toSessionUser({
        id: "user-1",
        name: "Inactive User",
        email: "inactive@assetflow.demo",
        role: "EMPLOYEE",
        status: "INACTIVE",
        departmentId: null,
      })
    ).toThrow(AuthenticationError);

    try {
      toSessionUser({
        id: "user-1",
        name: "Inactive User",
        email: "inactive@assetflow.demo",
        role: "EMPLOYEE",
        status: "INACTIVE",
        departmentId: null,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AuthenticationError);
      expect((error as AuthenticationError).code).toBe("AUTH_003");
    }
  });
});
