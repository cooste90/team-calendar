"use client";

import { startTransition, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { formatPeople } from "@/domain/format";
import { type Actor, canDeleteUser, canManageBusinessUnits } from "@/domain/permissions";
import { UNASSIGNED_GROUP_NAME } from "@/domain/teams";
import { moveUserToTeamAction } from "@/server/actions/move-user-to-team";
import type { AdminTeam } from "@/server/queries/teams";
import type { AdminUser } from "@/server/queries/users";
import type { BusinessUnitOption } from "./admin-dialog";
import { DeleteUserDialog } from "./delete-user-dialog";
import { MoveBusinessUnitDialog } from "./move-business-unit-dialog";
import { actionsButtonId, teamSelectId, UserRow } from "./user-row";

type Props = {
  viewer: Actor;
  businessUnitId: string;
  otherBusinessUnits: BusinessUnitOption[];
  teams: AdminTeam[]; // in admin order
  users: AdminUser[]; // by surname
  onAnnounce: (message: string) => void;
};

// The admin dialog's Users tab (spec §9): everyone in the BU, a section per team then
// Unassigned, with a search box. The whole BU is already here, so searching just filters
// the list in the browser.
export function UsersTab({
  viewer,
  businessUnitId,
  otherBusinessUnits,
  teams,
  users,
  onAnnounce,
}: Props) {
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [movingBusinessUnit, setMovingBusinessUnit] = useState<AdminUser | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchId = useId();
  // Where focus goes when a dialog closes: the "⋯" button that opened it, or the search
  // box (null) once the person has left this BU's list. Radix can't do this itself: it
  // would go back to the menu item that opened the dialog, which has gone.
  const returnFocusTo = useRef<string | null>(null);
  const lastTeamChange = useRef<string | null>(null); // the person whose team just changed
  const canMoveBusinessUnit = canManageBusinessUnits(viewer);

  // Their row comes back from the server in another team's section, which loses focus.
  // Put it back on their Team select.
  useEffect(() => {
    const userId = lastTeamChange.current;
    if (!userId || !users.some((user) => user.id === userId)) return;
    lastTeamChange.current = null;
    document.getElementById(teamSelectId(userId))?.focus();
  }, [users]);

  function changeTeam(user: AdminUser, teamId: string) {
    lastTeamChange.current = user.id;
    const teamName = teams.find((team) => team.id === teamId)?.name;
    startTransition(async () => {
      const result = await moveUserToTeamAction({ userId: user.id, teamId });
      if (!result.ok) {
        lastTeamChange.current = null;
        toast.error(result.error.message);
        onAnnounce(result.error.message);
        return;
      }
      onAnnounce(`${user.name} moved to ${teamName}.`);
    });
  }

  // After a delete or a move to another BU the person's row has gone.
  function personLeft(message: string) {
    returnFocusTo.current = null;
    setDeleting(null);
    setMovingBusinessUnit(null);
    onAnnounce(message);
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    const button = returnFocusTo.current && document.getElementById(returnFocusTo.current);
    (button || searchInput.current)?.focus();
  }

  const shown = users.filter((user) => matchesSearch(user, search));
  const groups: { teamId: string | null; name: string }[] = [
    ...teams.map((team) => ({ teamId: team.id, name: team.name })),
    { teamId: null, name: UNASSIGNED_GROUP_NAME },
  ];
  const sections = groups
    .map((section) => ({
      ...section,
      id: `${searchId}-${section.teamId ?? "unassigned"}`,
      people: shown.filter((user) => user.teamId === section.teamId),
    }))
    .filter((section) => section.people.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor={searchId} className="font-semibold text-[0.8125rem]">
          Search people
        </label>
        <Input
          ref={searchInput}
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoComplete="off"
          aria-describedby={`${searchId}-hint`}
          className="h-9"
        />
        <p id={`${searchId}-hint`} className="text-muted-foreground text-xs">
          Name, email or employee number.
        </p>
      </div>

      {sections.length === 0 && <p className="text-muted-foreground">No one matches “{search}”.</p>}
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={section.id}>
          <h3 id={section.id} className="font-semibold text-[0.8125rem]">
            {section.name} · {formatPeople(section.people.length)}
          </h3>
          <ul className="mt-1 rounded-xl border px-3.5">
            {section.people.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                teams={teams}
                canDelete={canDeleteUser(viewer, { ...user, businessUnitId })}
                canMoveBusinessUnit={canMoveBusinessUnit}
                onTeamChange={changeTeam}
                onMoveBusinessUnit={(person) => {
                  returnFocusTo.current = actionsButtonId(person.id);
                  setMovingBusinessUnit(person);
                }}
                onDelete={(person) => {
                  returnFocusTo.current = actionsButtonId(person.id);
                  setDeleting(person);
                }}
              />
            ))}
          </ul>
        </section>
      ))}

      {/* Each dialog is only there while it's open, so it starts fresh every time. */}
      {deleting && (
        <DeleteUserDialog
          user={deleting}
          onCancel={() => setDeleting(null)}
          onDeleted={personLeft}
          onCloseAutoFocus={restoreFocus}
        />
      )}
      {movingBusinessUnit && (
        <MoveBusinessUnitDialog
          user={movingBusinessUnit}
          businessUnits={otherBusinessUnits}
          onCancel={() => setMovingBusinessUnit(null)}
          onMoved={personLeft}
          onCloseAutoFocus={restoreFocus}
        />
      )}
    </div>
  );
}

// Matches the name (preferred or from SSO), email or employee number, ignoring case.
function matchesSearch(user: AdminUser, search: string) {
  const words = search.trim().toLocaleLowerCase("en-GB");
  const fields = [user.name, user.ssoName ?? "", user.email, user.employeeNumber];
  return fields.some((field) => field.toLocaleLowerCase("en-GB").includes(words));
}
