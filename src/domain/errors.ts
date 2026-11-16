// The small set of errors the app throws on purpose. Each has a `code` that
// authedAction (T14) turns into the result the UI shows. Throw these, and let
// authedAction catch them: no try/catch needed in services.
import type { CalendarDate } from "./dates";
import type { LeaveType } from "./leave-types";
import type { HalfDay } from "./slots";

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

// One clash: the booking already there, the half-days that clash, and a sentence saying
// so ("Tom Okafor already has Annual leave on Fri 13 Nov (full day).").
export type ConflictDetail = {
  bookingId: string;
  type: LeaveType;
  startDate: CalendarDate;
  startHalf: HalfDay;
  endDate: CalendarDate;
  endHalf: HalfDay;
  message: string;
};

// The change clashes with existing bookings. `conflicts` lists each clash, so the form
// can show them and offer Replace (spec §5.5).
export class ConflictError extends AppError {
  readonly conflicts: ConflictDetail[];

  constructor(message: string, conflicts: ConflictDetail[]) {
    super("CONFLICT", message);
    this.conflicts = conflicts;
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
