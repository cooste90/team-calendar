import { expect, it } from "vitest";
import { type ConflictDetail, ConflictError, ForbiddenError, NotFoundError } from "../errors";

it.each([
  { error: new ForbiddenError("Admins only."), code: "FORBIDDEN", message: "Admins only." },
  { error: new NotFoundError("No such unit."), code: "NOT_FOUND", message: "No such unit." },
  { error: new ConflictError("It clashes.", []), code: "CONFLICT", message: "It clashes." },
])("a $code error keeps its code and message", ({ error, code, message }) => {
  expect(error).toMatchObject({ code, message });
});

it("a ConflictError carries the list of clashes", () => {
  const clash: ConflictDetail = {
    bookingId: "b1",
    type: "ANNUAL",
    startDate: "2026-11-13",
    startHalf: "AM",
    endDate: "2026-11-13",
    endHalf: "PM",
    message: "You already have Annual leave on Fri 13 Nov (full day).",
  };
  expect(new ConflictError("It clashes.", [clash]).conflicts).toEqual([clash]);
});
