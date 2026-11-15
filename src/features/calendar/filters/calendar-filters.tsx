"use client";

import { ListFilterIcon, UsersIcon } from "lucide-react";
import type { FilterOption } from "@/domain/filter-options";
import { useCalendarFilters } from "../use-calendar-params";
import { FilterBuilder } from "./filter-builder";

type Props = { teamOptions: FilterOption[]; personOptions: FilterOption[] };

// The Teams and People filters in a wide header. The grid shows anyone in a chosen team
// plus anyone chosen by name (spec §2.4).
export function CalendarFilters({ teamOptions, personOptions }: Props) {
  const [filters, setFilters] = useCalendarFilters();

  return (
    <>
      <FilterBuilder
        label="Teams"
        icon={<ListFilterIcon aria-hidden="true" />}
        options={teamOptions}
        selectedIds={filters.teams}
        onChange={(teams) => setFilters({ teams })}
      />
      <FilterBuilder
        label="People"
        icon={<UsersIcon aria-hidden="true" />}
        options={personOptions}
        selectedIds={filters.people}
        onChange={(people) => setFilters({ people })}
      />
    </>
  );
}
