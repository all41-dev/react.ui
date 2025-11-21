export type ApiErrorPayload = unknown;

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly payload?: ApiErrorPayload;
  readonly cause?: unknown;

  constructor(
    message: string,
    opts?: {
      status?: number;
      code?: string;
      payload?: ApiErrorPayload;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "ApiError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.payload = opts?.payload;
    this.cause = opts?.cause;

    Object.setPrototypeOf(this, new.target.prototype);

    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ApiError);
    }
  }
}

export class ApiAuthError extends ApiError {
  constructor(
    message = "Authentication required",
    opts?: { status?: number; code?: string; payload?: ApiErrorPayload; cause?: unknown }
  ) {
    super(message, { status: opts?.status ?? 401, code: opts?.code ?? "AUTH_REQUIRED", payload: opts?.payload, cause: opts?.cause });
    this.name = "ApiAuthError";
    Object.setPrototypeOf(this, new.target.prototype);
    if ((Error as any).captureStackTrace) (Error as any).captureStackTrace(this, ApiAuthError);
  }
}

// ---------- helpers

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function getApiMessage(err: unknown, fallback = "Something went wrong") {
  if (isApiError(err) && err.message) return err.message;

  const any = err as any;
  return (
    any?.response?.data?.message ||
    any?.data?.message ||
    any?.message ||
    fallback
  );
}

export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  let payload: any = null;
  try {
    payload = await res.clone().json();
  } catch { /* ignore */ }

  const message =
    payload?.message ||
    `Request failed with status ${res.status}`;

  const ErrCtor = res.status === 401 ? ApiAuthError : ApiError;
  return new ErrCtor(message, { status: res.status, payload });
}
