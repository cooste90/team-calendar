// Who can do what (spec §1.2–1.4, §5.3; architecture §4). Server actions must call
// these before changing anything, and the UI uses them to hide or disable controls.
// Inputs are plain objects, never Prisma types.

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

// The signed-in person. teamId is null when they're Unassigned.
export type Actor = { id: string; role: Role; businessUnitId: string; teamId: string | null };

// The person whose bookings or profile are being changed.
export type Subject = { id: string; businessUnitId: string; teamId: string | null };

export type BusinessUnitAccess = { id: string; hidden: boolean };

// Anyone can view a normal BU. A hidden one is only for its members and super admins.
export function canViewBusinessUnit(actor: Actor, businessUnit: BusinessUnitAccess): boolean {
  return (
    actor.role === "SUPER_ADMIN" || !businessUnit.hidden || actor.businessUnitId === businessUnit.id
  );
}

// Admin powers: an ADMIN only inside their own BU, a SUPER_ADMIN everywhere.
export function canManageBusinessUnit(actor: Actor, businessUnitId: string): boolean {
  if (actor.role === "SUPER_ADMIN") return true;
  return actor.role === "ADMIN" && actor.businessUnitId === businessUnitId;
}

// Spec §5.3: a USER in a team can book for themselves and their teammates; an
// unassigned USER for nobody; an ADMIN for anyone in their BU; a SUPER_ADMIN for anyone.
export function canEditBookingsFor(actor: Actor, subject: Subject): boolean {
  if (actor.role !== "USER") return canManageBusinessUnit(actor, subject.businessUnitId);
  return actor.teamId !== null && actor.teamId === subject.teamId;
}

// Preferred name and working pattern: the person themselves, or an admin of their BU.
export function canEditProfileOf(actor: Actor, subject: Subject): boolean {
  return actor.id === subject.id || canManageBusinessUnit(actor, subject.businessUnitId);
}

// Public holidays are global, and any admin can manage them (spec §6.1).
export function canManagePublicHolidays(actor: Actor): boolean {
  return actor.role !== "USER";
}

// Creating, renaming, hiding and deleting BUs, and moving people between them (spec §1.3).
export function canManageBusinessUnits(actor: Actor): boolean {
  return actor.role === "SUPER_ADMIN";
}

// Deleting someone completely (spec §9): an admin of their BU, but never yourself, so an
// admin can't lock themselves out by mistake. Other admins can be deleted.
export function canDeleteUser(actor: Actor, subject: Subject): boolean {
  return actor.id !== subject.id && canManageBusinessUnit(actor, subject.businessUnitId);
}

// PDF export: admins of that BU only.
export function canExport(actor: Actor, businessUnitId: string): boolean {
  return canManageBusinessUnit(actor, businessUnitId);
}

// The Unassigned group on the grid: admins of that BU only.
export function canSeeUnassigned(actor: Actor, businessUnitId: string): boolean {
  return canManageBusinessUnit(actor, businessUnitId);
}
