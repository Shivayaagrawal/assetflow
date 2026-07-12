import { AppError } from "@/shared/errors/app-error";
import type { ErrorCode } from "@/shared/errors/codes";
import type { ActionResponse } from "@/shared/types/action-result";

export function throwOnFailure<T>(result: ActionResponse<T>): T {
  if (!result.success) {
    throw new AppError(result.error.code as ErrorCode, result.error.message);
  }
  return result.data;
}
