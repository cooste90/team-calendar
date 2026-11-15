"use client";

import { LayoutGridIcon } from "lucide-react";
import {
  type FocusEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { useCalendarStore } from "../calendar-store";
import { KeyContent } from "./key-content";

const OPEN_DELAY = 150; // ms, so the pointer passing over the button doesn't flash it open
const CLOSE_DELAY = 300; // ms, time to move the pointer from the button onto the key

// The header's Key button (spec §2.1). The key opens on hover, on keyboard focus and on
// click, and meets WCAG 1.4.13: Esc closes it, the pointer can move onto it, and it stays
// open until dismissed or until the pointer and focus have both left. A click pins it
// open until Esc, a click outside or another click.
// It's plain HTML, not a Radix Popover: the key comes straight after the button in the
// page, so Tab goes from the button into the key and on out again.
export function KeyPopover() {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const keyId = useId();
  const setShortcutsHelpOpen = useCalendarStore((store) => store.setShortcutsHelpOpen);

  // useCallback, because the effect below uses it.
  const close = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
    setPinned(false);
  }, []);

  // While it's open, Esc closes it wherever focus is, and so does a click outside it.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Esc from inside the key puts focus back on the button. Otherwise focus stays put.
      if (wrapperRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
      close();
    }

    function handlePointerDown(event: Event) {
      if (event.target instanceof Node && wrapperRef.current?.contains(event.target)) return;
      close();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, close]);

  function handlePointerEnter(event: PointerEvent) {
    // Touch has no hover: a tap is a click.
    if (event.pointerType === "touch") return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
  }

  function handlePointerLeave(event: PointerEvent) {
    if (event.pointerType === "touch") return;
    clearTimeout(timer.current);
    const hasKeyboardFocus = wrapperRef.current?.querySelector(":focus-visible");
    if (pinned || hasKeyboardFocus) return;
    timer.current = setTimeout(close, CLOSE_DELAY);
  }

  function handleButtonFocus(event: FocusEvent) {
    // Focus coming back from inside the key (Shift+Tab, or Esc) isn't a new visit.
    if (wrapperRef.current?.contains(event.relatedTarget)) return;
    clearTimeout(timer.current);
    setOpen(true);
  }

  function handleBlur(event: FocusEvent) {
    // Focus has left both the button and the key, and the pointer isn't over them.
    const focusStillInside = wrapperRef.current?.contains(event.relatedTarget);
    const pointerStillOver = wrapperRef.current?.matches(":hover");
    if (!focusStillInside && !pointerStillOver) close();
  }

  function handleClick() {
    if (pinned) {
      close();
      return;
    }
    clearTimeout(timer.current);
    setOpen(true);
    setPinned(true);
  }

  function showShortcuts() {
    // The help dialog gives focus back to whatever had it when it opened. This link
    // disappears with the key, so move focus to the Key button first.
    buttonRef.current?.focus();
    close();
    setShortcutsHelpOpen(true);
  }

  // The wrapper's handlers only notice the pointer and focus arriving and leaving; the
  // button is what people interact with.
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: see comment above
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: see comment above
    <div
      ref={wrapperRef}
      className="relative"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onBlur={handleBlur}
    >
      <Button
        ref={buttonRef}
        variant="outline"
        aria-expanded={open}
        aria-controls={open ? keyId : undefined}
        onClick={handleClick}
        onFocus={handleButtonFocus}
      >
        <LayoutGridIcon aria-hidden="true" />
        Key
      </Button>
      {/* The same look as PopoverContent in components/ui/popover.tsx, which can't be
          used here because it moves its content to the end of the page. */}
      {open && (
        <div
          id={keyId}
          className="fade-in-0 zoom-in-95 absolute top-full right-0 z-50 mt-1 flex w-80 origin-top-right animate-in flex-col gap-3 rounded-xl bg-popover p-3.5 text-popover-foreground text-sm shadow-popover ring-1 ring-foreground/10 duration-100"
        >
          <h2 className="font-semibold text-[0.8125rem]">Leave types</h2>
          <KeyContent onShowShortcuts={showShortcuts} />
        </div>
      )}
    </div>
  );
}
