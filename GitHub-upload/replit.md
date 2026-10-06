# ClaimLens

A one-page prototype for grocery-store claims managers to review incident reports.

## Product requirements

- The user explicitly requested no backend and no database.
- Review is simulated with keyword matching, not a real AI API.
- Do not score risk or make decisions. Separate report statements from information to confirm.
- Preserve source sentences alongside detected facts.

**Why:** This is a human-reviewed prototype, not an automated claims decision system.

## Run & Operate

- Managed frontend workflow: `artifacts/claimlens: web`.
- Typecheck: `pnpm --filter @workspace/claimlens run typecheck`.
- Frontend package: `artifacts/claimlens`.
- The preconfigured API and database packages are unused by ClaimLens and need not be running.

## Persistence

Reports and review edits live only in browser memory and clear on refresh. No report data is sent to a server.
