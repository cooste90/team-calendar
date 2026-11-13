<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project plan

The project plan lives in `docs/plan/`. Follow the agent protocol in `docs/plan/README.md`, and log every task in `docs/plan/progress.md`.

## Code style (summary of `docs/plan/04-code-style.md`)

The product owner is a junior developer who maintains this code by hand. Choose the obvious solution over the clever one.

- Write for a junior reader: any file should read top to bottom without looking things up.
- Keep it short, but never with dense one-liners or nested ternaries. A clear `if` wins.
- Don't repeat logic. Rules live once in `src/domain`, and zod schemas live once in `src/lib/schemas`.
- Don't add abstractions, options or code "for later". Extract on the fourth repeat, not the second.
- Platform first: HTML/CSS, then React/Next built-ins, then libraries already in the stack. New libraries only with a reason logged in `progress.md`.
- Server components load data. Server actions change it and call `refresh()`. No client data cache.
- Use plain names and plain types. No generics, branded types or type gymnastics unless unavoidable.
- One job per file, ~200 lines per file and ~40 per function at most.
- Comments explain *why*. No dead code, no commented-out code.
- Throw the typed errors from `src/domain/errors.ts`. Don't add `try/catch` everywhere.
- Name tests after the rule they prove, and use plain example tables.
- Don't use anything on the "Things we deliberately don't use" list in `04-code-style.md`.
- Before committing, re-read the diff and do the simplicity pass.
