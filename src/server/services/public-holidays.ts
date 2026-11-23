// Adding, changing and deleting public holidays (spec §6). They're global, so every change
// plans everyone's bookings with the public holiday planners. The preview runs exactly the
// same planning without saving, so its numbers always match what then happens.
import "server-only";
import { type CalendarDate, toDbDate } from "@/domain/dates";
import { ForbiddenError, NotFoundError, PastLockedError, ValidationError } from "@/domain/errors";
import { type BookingChanges, emptyChanges } from "@/domain/events";
import { formatLong } from "@/domain/format";
import { type Actor, canManagePublicHolidays } from "@/domain/permissions";
import {
  type HolidayImpact,
  holidayImpact,
  isPastHoliday,
  type PersonSnapshot,
  type PublicHoliday,
  planPublicHolidayCreate,
  planPublicHolidayDelete,
  planPublicHolidayMove,
} from "@/domain/public-holidays";
import type { Prisma } from "@/generated/prisma/client";
import type { HolidayChange } from "@/lib/schemas/public-holiday";
import { logPublicHolidayChange } from "../audit";
import { db, lockUsers } from "../db";
import { toPublicHoliday } from "../mappers";
import { loadEveryone } from "./public-holiday-snapshots";
import { saveBookingChanges } from "./save-booking-changes";

// A change for 1,000 people can take a few seconds (Prisma's default is 5).
const TRANSACTION = { timeout: 30_000 };

// The numbers for the confirm step. Nothing is saved.
export async function previewPublicHolidayChange(
  actor: Actor,
  change: HolidayChange,
  today: CalendarDate,
): Promise<HolidayImpact> {
  const holiday = await checkChange(db, actor, change, today);
  const { changes, people } = await planChange(db, change, holiday);
  return holidayImpact(changes, people, holiday.id);
}

// Saves the change, all or nothing, and returns what it did (the preview's numbers).
export async function savePublicHolidayChange(
  actor: Actor,
  change: HolidayChange,
  today: CalendarDate,
): Promise<HolidayImpact> {
  const started = performance.now();
  const impact = await db.$transaction(async (tx) => {
    let holiday = await checkChange(tx, actor, change, today);
    // Anyone could be affected, so everyone is locked until it's saved (architecture §3.2).
    const everyone = await tx.user.findMany({ select: { id: true } });
    await lockUsers(
      tx,
      everyone.map((user) => user.id),
    );
    if (change.kind === "create") {
      const row = await tx.publicHoliday.create({
        data: { name: holiday.name, date: toDbDate(holiday.date) },
      });
      holiday = toPublicHoliday(row);
    }
    const { changes, people } = await planChange(tx, change, holiday);
    await saveBookingChanges(tx, changes, actor.id);
    await saveHolidayRow(tx, change, holiday);
    return holidayImpact(changes, people, holiday.id);
  }, TRANSACTION);

  logPublicHolidayChange(change.kind, actor.id, impact, Math.round(performance.now() - started));
  return impact;
}

// Who may do it, and the rules every change follows (spec §6.1). Returns the holiday as it
// is now. A new one isn't saved yet, so its id is empty.
async function checkChange(
  tx: Prisma.TransactionClient,
  actor: Actor,
  change: HolidayChange,
  today: CalendarDate,
): Promise<PublicHoliday> {
  if (!canManagePublicHolidays(actor)) {
    throw new ForbiddenError("Only admins can manage public holidays.");
  }

  let holiday: PublicHoliday;
  if (change.kind === "create") {
    holiday = { id: "", name: change.name, date: change.date };
  } else {
    const row = await tx.publicHoliday.findUnique({ where: { id: change.id } });
    if (!row) throw new NotFoundError("That public holiday doesn't exist.");
    holiday = toPublicHoliday(row);
    if (isPastHoliday(holiday.date, today)) {
      throw new PastLockedError("Past public holidays can't be changed.");
    }
  }

  if (change.kind !== "delete") {
    if (isPastHoliday(change.date, today)) {
      throw new ValidationError("A public holiday can't be in the past.");
    }
    const sameDay = await tx.publicHoliday.findUnique({ where: { date: toDbDate(change.date) } });
    if (sameDay && sameDay.id !== holiday.id) {
      throw new ValidationError(
        `There's already a public holiday on ${formatLong(change.date)}: ${sameDay.name}.`,
      );
    }
  }
  return holiday;
}

// Everyone's bookings that change, worked out by the planners in one go.
async function planChange(
  tx: Prisma.TransactionClient,
  change: HolidayChange,
  holiday: PublicHoliday,
): Promise<{ changes: BookingChanges; people: PersonSnapshot[] }> {
  if (change.kind === "update") {
    if (change.date === holiday.date) {
      return { changes: emptyChanges(), people: [] }; // a rename moves no bookings (spec §6.4)
    }
    const moved = { ...holiday, name: change.name, date: change.date };
    const people = await loadEveryone(tx, [holiday.date, change.date], holiday.id);
    return { changes: planPublicHolidayMove(moved, holiday.date, change.date, people), people };
  }
  const people = await loadEveryone(tx, [holiday.date], holiday.id);
  if (change.kind === "create") {
    return { changes: planPublicHolidayCreate(holiday, people), people };
  }
  return { changes: planPublicHolidayDelete(holiday, people), people };
}

// The holiday itself, once its copies are saved.
async function saveHolidayRow(
  tx: Prisma.TransactionClient,
  change: HolidayChange,
  holiday: PublicHoliday,
) {
  if (change.kind === "delete") {
    // Its untouched copies are gone already; its exclusions go with it.
    await tx.publicHoliday.delete({ where: { id: holiday.id } });
  }
  if (change.kind === "update") {
    await tx.publicHoliday.update({
      where: { id: holiday.id },
      data: { name: change.name, date: toDbDate(change.date) },
    });
    // The grid shows a copy's notes as its label. Copies still showing the old name get
    // the new one; a note someone wrote on their copy is kept.
    await tx.event.updateMany({
      where: { publicHolidayId: holiday.id, notes: holiday.name },
      data: { notes: change.name },
    });
  }
}
