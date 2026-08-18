export type ApiErrorPayload = unknown;

/** V8-only; absent in other engines, so read it off the constructor defensively. */
const captureStackTrace = (
  Error as { captureStackTrace?: (target: object, ctor: unknown) => void }
).captureStackTrace;

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
    captureStackTrace?.(this, ApiError);
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
    captureStackTrace?.(this, ApiAuthError);
  }
}

// ---------- helpers

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

const prop = (o: unknown, key: string): unknown =>
  typeof o === "object" && o !== null
    ? (o as Record<string, unknown>)[key]
    : undefined;

/** A non-empty string `message`, or nothing — anything else is not user-facing text. */
const messageOf = (o: unknown): string | undefined => {
  const m = prop(o, "message");
  return typeof m === "string" && m !== "" ? m : undefined;
};

/*
 * Deliberately surfaces the server's own `message` in toasts and form banners: the grid
 * is a library and the backend is the consumer's, so its messages are assumed to be
 * user-facing (validation text, business errors). An API that returns internals in
 * `message` should not be pointed at this helper unfiltered.
 */
export function getApiMessage(err: unknown, fallback = "Something went wrong") {
  if (isApiError(err) && err.message) return err.message;

  return (
    messageOf(prop(prop(err, "response"), "data")) ??
    messageOf(prop(err, "data")) ??
    messageOf(err) ??
    fallback
  );
}

export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await res.clone().json();
  } catch { /* ignore */ }

  const message =
    messageOf(payload) ?? `Request failed with status ${res.status}`;

  const ErrCtor = res.status === 401 ? ApiAuthError : ApiError;
  return new ErrCtor(message, { status: res.status, payload });
}
