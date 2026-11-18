// Changing someone's profile details (spec §7). Working pattern changes are in
// availability.ts, because they also change public holiday bookings.
import "server-only";
import { ForbiddenError } from "@/domain/errors";
import { type Actor, canEditProfileOf } from "@/domain/permissions";
import { db } from "../db";
import { loadPerson } from "./booking-queries";

// null clears it, so the calendar shows their SSO first name again.
export async function updatePreferredName(
  actor: Actor,
  userId: string,
  preferredName: string | null,
) {
  const person = await loadPerson(db, userId);
  if (!canEditProfileOf(actor, person)) {
    throw new ForbiddenError("You can't change this person's profile.");
  }
  await db.user.update({ where: { id: userId }, data: { preferredName } });
}
