import "server-only";
import { db } from "../db";

// Every BU, hidden ones included, for first-time users to pick from (spec §1.3:
// new members of a hidden BU need to be able to join it).
export function listBusinessUnits() {
  return db.businessUnit.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
}
