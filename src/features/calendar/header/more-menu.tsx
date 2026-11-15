"use client";

import { EllipsisIcon, LayoutGridIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalendarStore } from "../calendar-store";
import { KeyContent } from "../key/key-content";

// On a narrow header the Key (and Export, from T33) move into this menu, so the header
// still fits at 320px (accessibility §1). Here the Key opens as a dialog: a menu item
// can't show a hover popover.
export function MoreMenu() {
  const [keyOpen, setKeyOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const setShortcutsHelpOpen = useCalendarStore((store) => store.setShortcutsHelpOpen);

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
          <DropdownMenuItem onSelect={() => setKeyOpen(true)}>
            <LayoutGridIcon aria-hidden="true" />
            Key
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={keyOpen} onOpenChange={setKeyOpen}>
        <DialogContent
          // The menu item that opened it has gone, so focus goes back to More.
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            moreButtonRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Leave types</DialogTitle>
          </DialogHeader>
          {/* The shortcuts dialog opens on top, and Esc there comes back here. */}
          <KeyContent onShowShortcuts={() => setShortcutsHelpOpen(true)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
