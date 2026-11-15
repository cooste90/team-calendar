"use client";

import { Button } from "@/components/ui/button";
import { type FilterOption, hasFilters } from "@/domain/filter-options";
import { formatFilterSummary } from "@/domain/format";
import { useCalendarFilters } from "../use-calendar-params";

type Props = { businessUnitName: string; teamOptions: FilterOption[] };

// The line under the period title: who's showing, and a way to clear the filters.
export function FilterSummary({ businessUnitName, teamOptions }: Props) {
  const [filters, setFilters] = useCalendarFilters();

  if (!hasFilters(filters)) {
    return (
      <p className="text-muted-foreground text-sm">{businessUnitName} · all teams · all people</p>
    );
  }

  const teamNames = teamOptions
    .filter((team) => filters.teams.includes(team.id))
    .map((team) => team.name);
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-sm">
      {formatFilterSummary(teamNames, filters.people.length)}
      <Button
        variant="link"
        className="h-6 px-0"
        onClick={() => setFilters({ teams: null, people: null })}
      >
        Clear filters
      </Button>
    </p>
  );
}
