import { ZodError } from "zod";
import {
  failure,
  success,
  type ActionResponse,
} from "@/shared/types/action-result";
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
    const mapped = toActionError(error);
    return failure(mapped.code, mapped.message);
  }
}
