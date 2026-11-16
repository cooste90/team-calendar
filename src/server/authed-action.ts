// Every server action is built with authedAction (architecture §6.2), so each one checks
// the session, validates its input, refreshes the page and reports errors the same way.
import "server-only";
import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import { AppError, type ConflictDetail, ConflictError, type ErrorCode } from "@/domain/errors";
import type { Actor } from "@/domain/permissions";
import { requireUser } from "./session";

export type ActionError = {
  code: ErrorCode | "INTERNAL";
  message: string;
  details?: string[]; // every validation message
  conflicts?: ConflictDetail[]; // every clash, for a CONFLICT
};

export type ActionResult<Data> = { ok: true; data: Data } | { ok: false; error: ActionError };

// Signed out? requireUser redirects to /sign-in, just as it does for pages.
// Permission checks belong in each handler, using the functions in src/domain/permissions.ts.
export function authedAction<Schema extends z.ZodType, Data>(
  schema: Schema,
  handler: (input: z.output<Schema>, actor: Actor) => Promise<Data>,
) {
  return async (input: z.input<Schema>): Promise<ActionResult<Data>> => {
    const actor = await requireUser();
    try {
      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        return {
          ok: false,
          error: { code: "VALIDATION", message: messages[0], details: messages },
        };
      }
      const data = await handler(parsed.data, actor);
      refresh();
      return { ok: true, data };
    } catch (error) {
      // Let Next.js handle its own redirect() and notFound() signals.
      unstable_rethrow(error);
      return { ok: false, error: toActionError(error) };
    }
  };
}

function toActionError(error: unknown): ActionError {
  if (error instanceof ConflictError) {
    return { code: error.code, message: error.message, conflicts: error.conflicts };
  }
  if (error instanceof AppError) {
    return { code: error.code, message: error.message };
  }
  // A bug or an outage: log it for us, and tell the user nothing about the internals.
  console.error("Server action failed", error);
  return { code: "INTERNAL", message: "Something went wrong. Please try again." };
}
