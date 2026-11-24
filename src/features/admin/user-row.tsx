"use client";

import { EllipsisIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { IconButton } from "@/components/icon-button";
import { InitialsAvatar } from "@/components/initials-avatar";
import { NativeSelect } from "@/components/native-select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleLabel } from "@/domain/roles";
import { serializeCalendarParams } from "@/lib/search-params";
import type { AdminTeam } from "@/server/queries/teams";
import type { AdminUser } from "@/server/queries/users";

type Props = {
  user: AdminUser;
  teams: AdminTeam[];
  canDelete: boolean; // false on your own row
  canMoveBusinessUnit: boolean; // super admins only
  onTeamChange: (user: AdminUser, teamId: string) => void;
  onMoveBusinessUnit: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
};

// The ids of a person's Team select and "⋯" button, so the Users tab can put focus back
// on them after their row moves or a dialog closes.
export function teamSelectId(userId: string) {
  return `team-for-${userId}`;
}
export function actionsButtonId(userId: string) {
  return `actions-for-${userId}`;
}

// One person in the Users tab (spec §9): who they are, their team (choosing another
// moves them at once), and a "⋯" menu with Open profile, Move to business unit… and Delete.
export function UserRow({
  user,
  teams,
  canDelete,
  canMoveBusinessUnit,
  onTeamChange,
  onMoveBusinessUnit,
  onDelete,
}: Props) {
  const searchParams = useSearchParams();
  // A link, so Back comes back to this tab. The profile dialog takes the admin dialog's place.
  const profileHref = `/${serializeCalendarParams(searchParams, { person: user.id, admin: null })}`;
  const role = roleLabel(user.role);

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b py-3 last:border-b-0">
      <InitialsAvatar initials={user.initials} className="size-9" />
      <div className="flex min-w-0 flex-1 basis-48 flex-col">
        <span className="flex flex-wrap items-center gap-x-2 font-medium">
          {user.name}
          {user.ssoName && (
            <span className="font-normal text-muted-foreground">({user.ssoName})</span>
          )}
          {role && <Badge variant="secondary">{role}</Badge>}
        </span>
        {/* One line: a very long email is cut short with "…" (the full one shows on
            hover, and screen readers read it all), rather than breaking mid-word. */}
        <span title={user.email} className="truncate text-muted-foreground text-xs">
          <span className="font-mono">{user.employeeNumber}</span> · {user.email}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* Unassigned isn't a choice: people only land there (spec §1.4). */}
        <NativeSelect
          id={teamSelectId(user.id)}
          aria-label={`Team for ${user.name}`}
          value={user.teamId ?? ""}
          onChange={(event) => onTeamChange(user, event.target.value)}
          className="w-44"
        >
          {user.teamId === null && (
            <option value="" disabled>
              Choose team…
            </option>
          )}
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </NativeSelect>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton id={actionsButtonId(user.id)} label={`More for ${user.name}`}>
              <EllipsisIcon aria-hidden="true" />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={profileHref as Route} scroll={false}>
                Open profile
              </Link>
            </DropdownMenuItem>
            {canMoveBusinessUnit && (
              <DropdownMenuItem onSelect={() => onMoveBusinessUnit(user)}>
                Move to business unit…
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              disabled={!canDelete}
              onSelect={() => onDelete(user)}
            >
              {canDelete ? "Delete…" : "You can't delete yourself"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}
