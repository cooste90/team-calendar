import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  PastLockedError,
  ValidationError,
} from "@/domain/errors";
import type { Actor } from "@/domain/permissions";
import { authedAction } from "./authed-action";

// The session and Next's refresh() only exist inside a real request, so stand them in.
const actor: Actor = { id: "anna", role: "USER", businessUnitId: "west", teamId: "ops" };
vi.mock("./session", () => ({ requireUser: async () => actor }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ refresh }));

const schema = z.object({ name: z.string().min(1, "Enter a name") });

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("authedAction", () => {
  it("passes the checked input and the signed-in person to the handler, then refreshes", async () => {
    const action = authedAction(schema, async (input, who) => `${input.name} by ${who.id}`);

    expect(await action({ name: "Team lunch" })).toEqual({ ok: true, data: "Team lunch by anna" });
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("reports invalid input as VALIDATION without running the handler", async () => {
    const handler = vi.fn();
    const action = authedAction(schema, handler);

    expect(await action({ name: "" })).toEqual({
      ok: false,
      error: { code: "VALIDATION", message: "Enter a name", details: ["Enter a name"] },
    });
    expect(handler).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it.each([
    { error: new ForbiddenError("Admins only."), code: "FORBIDDEN" },
    { error: new NotFoundError("No such booking."), code: "NOT_FOUND" },
    { error: new ValidationError("Can't change the type."), code: "VALIDATION" },
    { error: new PastLockedError("That day has passed."), code: "PAST_LOCKED" },
  ])("turns a thrown $code error into a $code result", async ({ error, code }) => {
    const action = authedAction(schema, async () => {
      throw error;
    });

    expect(await action({ name: "x" })).toEqual({
      ok: false,
      error: { code, message: error.message },
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("includes the clashes for a CONFLICT", async () => {
    const action = authedAction(schema, async () => {
      throw new ConflictError("That clashes.", ["Annual leave on Fri 13 Nov"]);
    });

    expect(await action({ name: "x" })).toEqual({
      ok: false,
      error: {
        code: "CONFLICT",
        message: "That clashes.",
        details: ["Annual leave on Fri 13 Nov"],
      },
    });
  });

  it("logs an unexpected error and returns INTERNAL without its details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const action = authedAction(schema, async () => {
      throw new Error("connection refused at 10.0.0.5");
    });

    const result = await action({ name: "x" });

    expect(result).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "Something went wrong. Please try again." },
    });
    expect(JSON.stringify(result)).not.toContain("10.0.0.5");
    expect(log).toHaveBeenCalledOnce();
  });
});
