import { ZodError } from "zod";
import {
  failure,
  success,
  type ActionResponse,
} from "@/shared/types/action-result";
import { AllocationConflictError } from "@/shared/errors/allocation-conflict.error";
import { toActionError, ValidationError } from "@/shared/errors/app-error";

export async function runAction<T>(
  fn: () => Promise<T>
): Promise<ActionResponse<T>> {
  try {
    const data = await fn();
    return success(data);
  } catch (error) {
    if (error instanceof ZodError) {
      return failure("GEN_001", error.errors[0]?.message ?? "Validation failed");
    }
    if (error instanceof ValidationError) {
      return failure(error.code, error.message);
    }
    if (error instanceof AllocationConflictError) {
      return failure(error.code, error.message, {
        allocationId: error.allocationId,
        holderName: error.holderName,
        assetId: error.assetId,
      });
    }
    const mapped = toActionError(error);
    return failure(mapped.code, mapped.message);
  }
}
