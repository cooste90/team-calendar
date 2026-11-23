// A business unit's name in the URL (spec §1.3): "West Operations" is ?bu=west-operations.

// The slug for a new BU: lower case, accents dropped, words joined by hyphens, and a
// number on the end if it's taken ("west-operations-2"). Renaming a BU keeps its slug, so
// old links keep working.
export function slugFor(name: string, takenSlugs: string[]): string {
  const words = name
    .normalize("NFD") // "é" becomes "e" plus an accent mark…
    .replace(/\p{M}/gu, "") // …and the accent mark goes
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const base = words || "unit";
  let slug = base;
  for (let number = 2; takenSlugs.includes(slug); number++) {
    slug = `${base}-${number}`;
  }
  return slug;
}
