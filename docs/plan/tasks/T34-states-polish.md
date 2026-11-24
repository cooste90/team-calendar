# T34 — Loading, empty, error and forbidden states; polish

**Phase:** 8 · **Depends on:** T33 · **Size:** M

## Goal
Every edge state is designed, and the app feels finished and smooth.

## Read first
- `node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md`, and `03-api-reference/03-file-conventions/error.md`, `not-found.md`, `forbidden.md`, `loading.md`
- `02-design-system.md` §6, §8

## Deliverables
1. **Route states:**
   - `app/error.tsx` and `(app)/error.tsx`: friendly messages with Retry, reset to `/`, and an error digest shown for support.
   - `not-found.tsx`, branded. **No `forbidden.tsx`** (product owner, T34): nothing in the app reaches a 403 page any more (a BU you can't see shows your own, a profile you can't see shows a toast, Admin is ignored, the PDF download is refused with a toast).
   - `(app)/loading.tsx`: a skeleton that matches the shell.
2. **Errors:** if a page load fails, `(app)/error.tsx` shows the friendly message with Retry (which calls `reset()`). If an action fails, the existing toast shows the message. Don't build extra offline or retry machinery.
3. **Session expiry** (changed by the product owner in T34: a page, not a dialog): when the session has ended, `requireUser()` calls Next's `unauthorized()` (the `authInterrupts` config), so a page load or an action shows the branded page "Your session has ended" with a "Sign in again" button. After signing in, they come back to the URL they were on (`callbackURL`). Opening a link while signed out (no cookie, so the proxy redirects to `/sign-in`) also comes back to that link.
4. **Polish pass:**
   - Check focus restoration on every dialog and popover close.
   - **From T29:** state set after an `await` inside `startTransition` isn't part of the transition (React 19), so a form briefly shows its result (e.g. the booking form's clash alert) with `pending` still true and its buttons disabled. Wrap those updates in their own `startTransition` in every form at once (booking form, profile tabs, admin forms), then drop the "wait until enabled" lines in `event-form.test.tsx`.
   - No layout shift when fonts load (next/font metrics).
   - Hover and press micro-interactions (150ms) consistent across buttons.
   - Tooltips on every icon-only button.
   - Smooth scrolling to today when it's off-screen ("Today" in the header scrolls horizontally in month view).
   - The favicon (logo) and `app/icon.svg`, theme-colour meta for light and dark, and `manifest` basics.
5. **Copy review:** go through all UI text against design system §8 (sentence case, en-GB dates, plain words).
6. **From T32:** the four delete confirmations (`delete-team-dialog`, `delete-user-dialog`, `delete-holiday-dialog`, `delete-business-unit-dialog` in `src/features/admin/`) share one `ConfirmDeleteDialog` shell (product owner, T34). Each keeps its own wording and checks.
7. **Final simplicity sweep** of the whole codebase against `04-code-style.md`: remove unused files, exports and dependencies (`pnpm dlx knip` is a quick way to find them), merge duplicated logic, and make sure every `src/domain` and `src/server/services` file starts with a one-line purpose comment. Record what changed in `progress.md`.

## Tests
- E2E: a failing action shows the error toast; expired session → the "Your session has ended" page, and signing in again comes back to the same URL; the 404 and error pages render with axe passing.

## Acceptance criteria
- The simplicity sweep is done, with no unused dependencies left in `package.json`.
- No unstyled or default Next error screens are reachable; Lighthouse (local, desktop) has Performance ≥ 90, Accessibility 100 and Best Practices ≥ 95 on the calendar page with the default seed.
