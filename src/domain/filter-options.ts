// The choices in the Teams and People filters (spec §2.4), for the BU on screen.
import { compareBySurname, displayName, type PersonName } from "./display-name";
import type { GridTeam } from "./grid-model-types";
import { byAdminOrder, UNASSIGNED_GROUP_NAME } from "./teams";

// The chosen team and person ids, as in the URL (?teams=…&people=…).
export type Filters = { teams: string[]; people: string[] };

// With no filters on, everyone is shown.
export function hasFilters(filters: Filters): boolean {
  return filters.teams.length > 0 || filters.people.length > 0;
}

// group is the heading the option sits under (people are grouped by team), or null.
export type FilterOption = { id: string; name: string; group: string | null };

type Person = PersonName & { id: string; teamId: string | null };

// Teams in the admin-defined order.
export function teamFilterOptions(teams: GridTeam[]): FilterOption[] {
  return byAdminOrder(teams).map((team) => ({ id: team.id, name: team.name, group: null }));
}

// People grouped by team, teams in admin order, then anyone unassigned (only admins get
// them), each group by surname.
export function personFilterOptions(teams: GridTeam[], people: Person[]): FilterOption[] {
  const groups: { teamId: string | null; name: string }[] = [
    ...byAdminOrder(teams).map((team) => ({ teamId: team.id, name: team.name })),
    { teamId: null, name: UNASSIGNED_GROUP_NAME },
  ];
  return groups.flatMap((group) =>
    people
      .filter((person) => person.teamId === group.teamId)
      .sort(compareBySurname)
      .map((person) => ({ id: person.id, name: displayName(person), group: group.name })),
  );
}
