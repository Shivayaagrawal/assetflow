import { ERROR_HTTP_STATUS, ERROR_MESSAGES, type ErrorCode } from "./codes";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;

  constructor(code: ErrorCode, message?: string) {
    const resolved = message ?? ERROR_MESSAGES[code];
    super(resolved);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = ERROR_HTTP_STATUS[code];
  }
}

export class AuthorizationError extends AppError {
  constructor(code: ErrorCode = "AUTH_007") {
    super(code);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(code: ErrorCode = "AUTH_002") {
    super(code);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends AppError {
  constructor(code: ErrorCode = "GEN_002") {
    super(code);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(code: ErrorCode) {
    super(code);
    this.name = "ConflictError";
  }
}

export class ValidationError extends AppError {
  constructor(message?: string) {
    super("GEN_001", message);
    this.name = "ValidationError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toActionError(error: unknown): {
  code: ErrorCode;
  message: string;
  httpStatus: number;
} {
  if (isAppError(error)) {
    return {
      code: error.code,
      message: error.message,
      httpStatus: error.httpStatus,
    };
  }
  return {
    code: "GEN_003",
    message: ERROR_MESSAGES.GEN_003,
    httpStatus: 500,
  };
}
