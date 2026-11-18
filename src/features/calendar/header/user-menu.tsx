"use client";

import { LogOutIcon, MonitorIcon, MoonIcon, ShieldIcon, SunIcon, UserIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { useId } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { serializeCalendarParams } from "@/lib/search-params";
import { signOut } from "@/server/actions/sign-out";
import type { UserMenuDetails } from "@/server/queries/user-menu";

// The avatar from the mockup. It looks the same in both themes: white text has at least
// 4.5:1 contrast on both ends of the gradient (the light theme's primary and sunset).
const avatarClass =
  "grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#4f46e5,#c2410c)] font-semibold text-[0.8125rem] text-white forced-colors:border forced-colors:border-[CanvasText]";

const itemClass = "h-9 gap-2.5 px-2.5 [&_svg]:text-muted-foreground";

const themes = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
];

// The avatar menu at the end of the header (spec §8): who you are, the theme, your
// profile, admin and sign out.
export function UserMenu({ user }: { user: UserMenuDetails }) {
  const { theme = "system", setTheme } = useTheme();
  const searchParams = useSearchParams();
  const themeLabelId = useId();
  // Profile and admin are dialogs opened by a URL param. A link adds a history entry, so
  // the browser's Back button closes them.
  const profileHref = `/${serializeCalendarParams(searchParams, { profile: "me" })}` as Route;
  const adminHref = `/${serializeCalendarParams(searchParams, { admin: "teams" })}` as Route;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* The label includes the initials people see, so speech users can say "click
            PS" (WCAG 2.5.3, label in name). */}
        <button
          type="button"
          aria-label={`User menu for ${user.name}, ${user.initials}`}
          className={`${avatarClass} size-9`}
        >
          {user.initials}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-1.5">
        <div className="mb-1.5 flex items-center gap-3 border-b px-2.5 pt-2.5 pb-3">
          <span aria-hidden="true" className={`${avatarClass} size-10`}>
            {user.initials}
          </span>
          <div className="min-w-0 text-muted-foreground text-xs">
            <p className="font-semibold text-foreground text-sm">{user.name}</p>
            <p className="truncate">{user.email}</p>
            <p>{user.details}</p>
          </div>
        </div>

        <DropdownMenuLabel
          id={themeLabelId}
          className="px-2.5 pt-2 pb-1.5 font-semibold text-[0.6875rem] uppercase tracking-[0.06em]"
        >
          Theme
        </DropdownMenuLabel>
        {/* next-themes saves the choice in this browser (spec §8: per device). */}
        <DropdownMenuRadioGroup
          aria-labelledby={themeLabelId}
          value={theme}
          onValueChange={setTheme}
          className="mx-2.5 mb-2 flex gap-1 rounded-xl border bg-surface-2 p-[3px]"
        >
          {/* Radix's RadioItem is used directly: the shadcn one adds a tick, but here the
              chosen theme is shown filled, like the segmented control.
              preventDefault keeps the menu open, so people can flick between themes. */}
          {themes.map(({ value, label, icon: Icon }) => (
            <DropdownMenuPrimitive.RadioItem
              key={value}
              value={value}
              onSelect={(event) => event.preventDefault()}
              className="flex h-7 flex-1 cursor-default select-none items-center justify-center gap-1.5 rounded-[9px] text-muted-foreground text-sm outline-hidden focus:text-foreground focus:ring-2 focus:ring-ring data-[state=checked]:bg-surface data-[state=checked]:text-foreground data-[state=checked]:shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_1px_var(--border)] forced-colors:data-[state=checked]:outline forced-colors:data-[state=checked]:outline-[Highlight]"
            >
              <Icon aria-hidden="true" className="size-3.5" />
              {label}
            </DropdownMenuPrimitive.RadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className={itemClass}>
          <Link href={profileHref} scroll={false}>
            <UserIcon aria-hidden="true" />
            My profile
          </Link>
        </DropdownMenuItem>
        {user.canOpenAdmin && (
          <DropdownMenuItem asChild className={itemClass}>
            <Link href={adminHref} scroll={false}>
              <ShieldIcon aria-hidden="true" />
              Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className={itemClass} onSelect={() => signOut()}>
          <LogOutIcon aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
