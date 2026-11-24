"use client";

import { PlusIcon, SettingsIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Wordmark } from "@/components/brand/wordmark";
import { LeaveChip } from "@/components/leave-chip";
import { SegmentedControl } from "@/components/segmented-control";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { leaveTypes } from "@/domain/leave-types";

const swatches = [
  "bg",
  "surface",
  "surface-2",
  "border",
  "text",
  "text-muted",
  "primary",
  "primary-solid",
  "primary-soft",
  "today",
  "sunset",
  "me",
  "destructive",
  "warning-bg",
];

export function Gallery() {
  const [view, setView] = useState("week");
  const [growKey, setGrowKey] = useState(0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Wordmark />
        <ThemeToggle />
      </header>
      <h1 className="font-semibold text-[1.3125rem] tracking-[-0.015em]">Design system</h1>

      <Section title="Brand">
        <div className="flex items-center gap-4">
          <Logo size={64} label="WestCal logo" />
          <p className="text-muted-foreground">See who's in, at a glance.</p>
        </div>
      </Section>

      <Section title="Colours (current theme)">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {swatches.map((name) => (
            <li key={name} className="flex items-center gap-2.5">
              <span
                className="size-10 rounded-lg border"
                style={{ background: `var(--${name})` }}
              />
              <code className="font-mono text-xs">--{name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Leave types in both themes">
        <div className="grid gap-4 sm:grid-cols-2">
          {["light", "dark"].map((theme) => (
            <div
              key={theme}
              className={`${theme} rounded-xl border bg-surface p-5 text-foreground`}
            >
              <h3 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
                {theme}
              </h3>
              <ul className="grid gap-2.5">
                {Object.values(leaveTypes).map((info) => (
                  <li key={info.type} className="flex items-center gap-3">
                    <LeaveChip type={info.type} />
                    <span className="font-medium">{info.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <PlusIcon /> Add event
          </Button>
          <Button variant="outline">Today</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
          <Button variant="link">Link</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Settings">
                <SettingsIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid max-w-md gap-5">
          <Field>
            <FieldLabel htmlFor="preferred-name">Preferred name</FieldLabel>
            <Input id="preferred-name" defaultValue="Priya" />
            <FieldDescription>Shown on the calendar instead of your first name.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="notes">Notes</FieldLabel>
            <Textarea id="notes" placeholder="Optional, up to 500 characters" />
          </Field>
        </div>
      </Section>

      <Section title="Segmented control">
        <SegmentedControl
          label="View"
          value={view}
          onValueChange={setView}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
        />
      </Section>

      <Section title="Dialog and popover">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this booking?</DialogTitle>
                <DialogDescription>Annual leave, Mon 9 to Wed 11 November.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button variant="destructive">Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open popover</Button>
            </PopoverTrigger>
            <PopoverContent>
              Popovers use the surface colour, a 14px radius and a soft shadow.
            </PopoverContent>
          </Popover>
        </div>
      </Section>

      <Section title="Grid patterns and motion">
        <div className="flex flex-wrap items-center gap-4">
          <PatternBox className="bg-hatch" label="Not working" />
          <PatternBox className="bg-hatch-right" label="AM only" />
          <PatternBox className="bg-hatch-left" label="PM only" />
          <span className="flex h-11 items-center gap-2 rounded-lg bg-today px-3">
            <span className="grid size-6.5 place-items-center rounded-full bg-sunset font-semibold text-on-sunset">
              22
            </span>
            Today
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span
            key={growKey}
            className="flex h-7.5 w-64 animate-grow items-center rounded-bar bg-leave-al px-2.5 font-semibold text-leave-al-fg text-xs"
          >
            AL · 3 days
          </span>
          <Button variant="outline" onClick={() => setGrowKey(growKey + 1)}>
            Replay grow
          </Button>
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PatternBox({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
      <span className={`h-11 w-16 rounded-md border bg-surface ${className}`} />
      {label}
    </span>
  );
}

// next-themes only knows the saved theme in the browser, so wait until mounted
// before showing which option is selected (avoids a hydration mismatch).
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <SegmentedControl
      label="Theme"
      value={mounted ? (theme ?? "system") : ""}
      onValueChange={setTheme}
      options={[
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "system", label: "System" },
      ]}
    />
  );
}
