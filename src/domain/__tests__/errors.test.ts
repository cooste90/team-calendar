import { expect, it } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";

it.each([
  { error: new ForbiddenError("Admins only."), code: "FORBIDDEN", message: "Admins only." },
  { error: new NotFoundError("No such unit."), code: "NOT_FOUND", message: "No such unit." },
  { error: new ConflictError("It clashes.", []), code: "CONFLICT", message: "It clashes." },
])("a $code error keeps its code and message", ({ error, code, message }) => {
  expect(error).toMatchObject({ code, message });
});

it("a ConflictError carries the list of clashes", () => {
  const error = new ConflictError("It clashes.", ["Annual leave on Fri 13 Nov"]);
  expect(error.details).toEqual(["Annual leave on Fri 13 Nov"]);
});
