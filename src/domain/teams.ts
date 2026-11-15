// How teams are ordered and named in lists: the grid's groups and the filters.
import type { GridTeam } from "./grid-model-types";

// People with no team are listed under this name, last (admins only, spec §1.4).
export const UNASSIGNED_GROUP_NAME = "Unassigned";

// Teams in the order an admin has set (spec §2.3).
export function byAdminOrder(teams: GridTeam[]): GridTeam[] {
  return [...teams].sort((a, b) => a.sortOrder - b.sortOrder);
}
