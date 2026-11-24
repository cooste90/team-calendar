"use server";

import { z } from "zod";
import { idSchema } from "@/domain/ids";
import { authedAction } from "@/server/authed-action";
import { deleteUser } from "@/server/services/users";

// Delete user in the admin dialog's Users tab, after typing their surname (spec §9).
export const deleteUserAction = authedAction(z.object({ userId: idSchema }), ({ userId }, actor) =>
  deleteUser(actor, userId),
);
