// The small set of errors the app throws on purpose. Each has a `code` that
// authedAction (T14) turns into the result the UI shows. Throw these, and let
// authedAction catch them: no try/catch needed in services.

export type ErrorCode = "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "PAST_LOCKED";

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// The signed-in person isn't allowed to do this.
export class ForbiddenError extends AppError {
  constructor(message: string) {
    super("FORBIDDEN", message);
  }
}

// The thing doesn't exist, or the signed-in person isn't allowed to know it exists
// (e.g. a hidden BU they don't belong to).
export class NotFoundError extends AppError {
  constructor(message: string) {
    super("NOT_FOUND", message);
  }
}

// The change clashes with existing bookings. `details` lists the clashes so the UI can
// show them (spec §5.5).
export class ConflictError extends AppError {
  readonly details: string[];

  constructor(message: string, details: string[]) {
    super("CONFLICT", message);
    this.details = details;
  }
}

// Something about the input breaks a rule, e.g. changing the type of a booking that has started.
export class ValidationError extends AppError {
  constructor(message: string) {
    super("VALIDATION", message);
  }
}

// The change touches dates that are locked because they're in the past (spec §5.4).
export class PastLockedError extends AppError {
  constructor(message: string) {
    super("PAST_LOCKED", message);
  }
}
