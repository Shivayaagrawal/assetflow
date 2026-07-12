import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { assertLastAdminGuard } from "@/modules/identity/domain/last-admin.guard";
import { ConflictError } from "@/shared/errors/app-error";

function mockTx(overrides: {
  current?: { role: "ADMIN" | "EMPLOYEE"; status: "ACTIVE" | "INACTIVE" };
  otherActiveAdmins?: number;
}) {
  return {
    user: {
      findUniqueOrThrow: async () =>
        overrides.current ?? { role: "ADMIN", status: "ACTIVE" },
      count: async () => overrides.otherActiveAdmins ?? 0,
    },
  } as unknown as Prisma.TransactionClient;
}

describe("last admin guard", () => {
  it("blocks deactivating the last active admin with ORG_005", async () => {
    await expect(
      assertLastAdminGuard(mockTx({ otherActiveAdmins: 0 }), "admin-1", "ADMIN", "INACTIVE")
    ).rejects.toSatisfy((error: unknown) => {
      return error instanceof ConflictError && error.code === "ORG_005";
    });
  });

  it("allows deactivation when another active admin exists", async () => {
    await expect(
      assertLastAdminGuard(mockTx({ otherActiveAdmins: 1 }), "admin-1", "ADMIN", "INACTIVE")
    ).resolves.toBeUndefined();
  });
});
