"use client";

import { EllipsisIcon, LayoutGridIcon, ListFilterIcon, UsersIcon } from "lucide-react";
import { type ReactNode, type RefObject, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FilterOption } from "@/domain/filter-options";
import { formatFilterName } from "@/domain/format";
import { useCalendarStore } from "../calendar-store";
import { FilterLabel } from "../filters/filter-builder";
import { FilterPanel } from "../filters/filter-panel";
import { KeyContent } from "../key/key-content";
import { useCalendarFilters } from "../use-calendar-params";

type Props = { teamOptions: FilterOption[]; personOptions: FilterOption[] };

// On a narrow header the filters and the Key (and Export, from T33) move into this menu,
// so the header still fits at 320px (accessibility §1). Each one opens as a dialog.
export function MoreMenu({ teamOptions, personOptions }: Props) {
  const [opened, setOpened] = useState<"teams" | "people" | "key" | null>(null);
  const [filters, setFilters] = useCalendarFilters();
  const setShortcutsHelpOpen = useCalendarStore((store) => store.setShortcutsHelpOpen);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const close = () => setOpened(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={moreButtonRef} variant="outline">
            <EllipsisIcon aria-hidden="true" />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            aria-label={formatFilterName("Teams", filters.teams.length)}
            onSelect={() => setOpened("teams")}
          >
            <ListFilterIcon aria-hidden="true" />
            <FilterLabel label="Teams" count={filters.teams.length} />
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-label={formatFilterName("People", filters.people.length)}
            onSelect={() => setOpened("people")}
          >
            <UsersIcon aria-hidden="true" />
            <FilterLabel label="People" count={filters.people.length} />
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setOpened("key")}>
            <LayoutGridIcon aria-hidden="true" />
            Key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MoreDialog
        title="Teams"
        open={opened === "teams"}
        onClose={close}
        moreButtonRef={moreButtonRef}
        searchRef={searchRef}
      >
        <FilterPanel
          label="Teams"
          options={teamOptions}
          selectedIds={filters.teams}
          onChange={(teams) => setFilters({ teams })}
          onDone={close}
          searchRef={searchRef}
        />
      </MoreDialog>
      <MoreDialog
        title="People"
        open={opened === "people"}
        onClose={close}
        moreButtonRef={moreButtonRef}
        searchRef={searchRef}
      >
        <FilterPanel
          label="People"
          options={personOptions}
          selectedIds={filters.people}
          onChange={(people) => setFilters({ people })}
          onDone={close}
          searchRef={searchRef}
        />
      </MoreDialog>
      <MoreDialog
        title="Leave types"
        open={opened === "key"}
        onClose={close}
        moreButtonRef={moreButtonRef}
      >
        {/* The shortcuts dialog opens on top, and Esc there comes back here. */}
        <KeyContent onShowShortcuts={() => setShortcutsHelpOpen(true)} />
      </MoreDialog>
    </>
  );
}

type MoreDialogProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  moreButtonRef: RefObject<HTMLButtonElement | null>;
  searchRef?: RefObject<HTMLInputElement | null>; // a filter's search box, focused on open
  children: ReactNode;
};

// A dialog opened from the menu. Focus starts in its search box, if it has one, and goes
// back to More when it closes, because the menu item that opened it has gone. (It only
// ever closes, so onOpenChange means close.)
function MoreDialog(props: MoreDialogProps) {
  const { title, open, onClose, moreButtonRef, searchRef, children } = props;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          if (!searchRef?.current) return;
          event.preventDefault();
          searchRef.current.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          moreButtonRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
