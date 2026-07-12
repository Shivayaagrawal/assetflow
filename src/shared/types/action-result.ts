import type { UserRole, UserStatus } from "@prisma/client";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  departmentId: string | null;
};

export type ActionResult<T> = {
  success: true;
  data: T;
  error?: undefined;
  meta?: Record<string, unknown>;
};

export type ActionFailure = {
  success: false;
  data?: undefined;
  error: { code: string; message: string };
  meta?: Record<string, unknown>;
};

export type ActionResponse<T> = ActionResult<T> | ActionFailure;

export function success<T>(data: T, meta?: Record<string, unknown>): ActionResult<T> {
  return { success: true, data, meta };
}

export function failure(code: string, message: string): ActionFailure {
  return { success: false, error: { code, message } };
}
