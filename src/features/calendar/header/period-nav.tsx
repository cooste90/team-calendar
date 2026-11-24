"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { IconButton } from "@/components/icon-button";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import {
  anchorForMonthSelection,
  type CalendarDate,
  shiftPeriod,
  type View,
  yearOptions,
} from "@/domain/dates";
import { LONG_MONTHS } from "@/domain/format";

// Previous · Month · Year · Next · Today (spec §2.1). It only works out where to go;
// onNavigate does the going. null means "today".
export function PeriodNav({
  view,
  anchor,
  today,
  onNavigate,
}: {
  view: View;
  anchor: CalendarDate;
  today: CalendarDate;
  onNavigate: (date: CalendarDate | null) => void;
}) {
  const month = Number(anchor.slice(5, 7));
  const year = Number(anchor.slice(0, 4));

  return (
    <>
      <IconButton
        variant="outline"
        label={`Previous ${view}`}
        onClick={() => onNavigate(shiftPeriod(view, anchor, -1))}
      >
        <ChevronLeftIcon aria-hidden="true" />
      </IconButton>
      <NativeSelect
        aria-label="Month"
        value={month}
        onChange={(event) =>
          onNavigate(anchorForMonthSelection(view, Number(event.target.value), year))
        }
      >
        {LONG_MONTHS.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        aria-label="Year"
        value={year}
        onChange={(event) =>
          onNavigate(anchorForMonthSelection(view, month, Number(event.target.value)))
        }
      >
        {yearOptions(today).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </NativeSelect>
      <IconButton
        variant="outline"
        label={`Next ${view}`}
        onClick={() => onNavigate(shiftPeriod(view, anchor, 1))}
      >
        <ChevronRightIcon aria-hidden="true" />
      </IconButton>
      <Button variant="outline" onClick={() => onNavigate(null)}>
        Today
      </Button>
    </>
  );
}
