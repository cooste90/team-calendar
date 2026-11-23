"use client";

import { FileDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadAttendancePdf, EXPORT_RANGES } from "./download-attendance-pdf";

// The header's Export PDF button (spec §10), for admins of the BU on screen: a printable
// attendance sheet for today, this week or next week.
export function ExportMenu({ businessUnitSlug }: { businessUnitSlug: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <FileDownIcon aria-hidden="true" />
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPORT_RANGES.map(({ range, label }) => (
          <DropdownMenuItem
            key={range}
            onSelect={() => downloadAttendancePdf(businessUnitSlug, range)}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
