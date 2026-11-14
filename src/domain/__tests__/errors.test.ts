import { expect, it } from "vitest";
import { ForbiddenError } from "../errors";

it("a ForbiddenError has the FORBIDDEN code and the given message", () => {
  expect(new ForbiddenError("Admins only.")).toMatchObject({
    code: "FORBIDDEN",
    message: "Admins only.",
  });
});
