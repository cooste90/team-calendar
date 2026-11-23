// Managing business units from the admin dialog (spec §1.3, §9): create, rename, hide and
// delete. Super admins only.
import "server-only";
import { slugFor } from "@/domain/business-units";
import { ForbiddenError, NotFoundError, ValidationError } from "@/domain/errors";
import { formatPeople } from "@/domain/format";
import { type Actor, canManageBusinessUnits } from "@/domain/permissions";
import { db } from "../db";

function checkCanManage(actor: Actor) {
  if (!canManageBusinessUnits(actor)) {
    throw new ForbiddenError("Only super admins can manage business units.");
  }
}

// Names are unique whatever their case, so "west operations" can't sit next to
// "West Operations". The database's unique index catches exact copies saved at once.
async function checkNameIsFree(name: string, renamingId?: string) {
  const sameName = await db.businessUnit.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      id: { not: renamingId }, // when creating it's undefined, which Prisma ignores
    },
  });
  if (sameName) {
    throw new ValidationError(`There's already a business unit called ${sameName.name}.`);
  }
}

async function loadBusinessUnit(id: string) {
  const unit = await db.businessUnit.findUnique({ where: { id } });
  if (!unit) throw new NotFoundError("That business unit doesn't exist.");
  return unit;
}

export async function createBusinessUnit(actor: Actor, name: string) {
  checkCanManage(actor);
  await checkNameIsFree(name);
  const taken = await db.businessUnit.findMany({ select: { slug: true } });
  const slug = slugFor(
    name,
    taken.map((unit) => unit.slug),
  );
  await db.businessUnit.create({ data: { name, slug } });
}

// The slug stays as it was, so links to the BU keep working.
export async function renameBusinessUnit(actor: Actor, id: string, name: string) {
  checkCanManage(actor);
  await loadBusinessUnit(id);
  await checkNameIsFree(name, id);
  await db.businessUnit.update({ where: { id }, data: { name } });
}

// A hidden BU is only visible to its own members and super admins (spec §1.3).
export async function setBusinessUnitHidden(actor: Actor, id: string, hidden: boolean) {
  checkCanManage(actor);
  await loadBusinessUnit(id);
  await db.businessUnit.update({ where: { id }, data: { hidden } });
}

// Only an empty BU can go. Its teams (empty too, then) are deleted with it.
export async function deleteBusinessUnit(actor: Actor, id: string) {
  checkCanManage(actor);
  await loadBusinessUnit(id);
  const people = await db.user.count({ where: { businessUnitId: id } });
  if (people > 0) {
    throw new ValidationError(`Move or delete its ${formatPeople(people)} first.`);
  }
  await db.$transaction([
    db.team.deleteMany({ where: { businessUnitId: id } }),
    db.businessUnit.delete({ where: { id } }),
  ]);
}
