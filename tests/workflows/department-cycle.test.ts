import { describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { assertNoDepartmentCycle } from "@/modules/organization/domain/department-cycle";
import { ConflictError } from "@/shared/errors/app-error";

function mockTx(parentById: Record<string, string | null>) {
  return {
    department: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        if (!(where.id in parentById)) return null;
        return { parentId: parentById[where.id] };
      },
    },
  } as unknown as Prisma.TransactionClient;
}

describe("department cycle guard", () => {
  it("rejects assigning a department as its own parent", async () => {
    await expect(
      assertNoDepartmentCycle(mockTx({}), "dept-a", "dept-a")
    ).rejects.toSatisfy((error: unknown) => {
      return error instanceof ConflictError && error.code === "ORG_002";
    });
  });

  it("rejects a direct parent cycle", async () => {
    await expect(
      assertNoDepartmentCycle(
        mockTx({
          "dept-b": "dept-a",
        }),
        "dept-a",
        "dept-b"
      )
    ).rejects.toSatisfy((error: unknown) => {
      return error instanceof ConflictError && error.code === "ORG_002";
    });
  });

  it("rejects an indirect parent cycle", async () => {
    await expect(
      assertNoDepartmentCycle(
        mockTx({
          "dept-c": "dept-b",
          "dept-b": "dept-a",
        }),
        "dept-a",
        "dept-c"
      )
    ).rejects.toSatisfy((error: unknown) => {
      return error instanceof ConflictError && error.code === "ORG_002";
    });
  });

  it("allows a valid parent assignment", async () => {
    await expect(
      assertNoDepartmentCycle(
        mockTx({
          "dept-c": "dept-b",
          "dept-b": null,
        }),
        "dept-a",
        "dept-c"
      )
    ).resolves.toBeUndefined();
  });
});
