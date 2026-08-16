# Progress Log (Claude sessions) — braintodo

Update this at the end of every session (Principle 5 & 12). This is what the
next session reads to avoid starting from zero.

## Prior sessions (reconstructed summary — exact session boundaries/dates unknown)
- Completed: F001–F019 (backend) and FE013, FE015, FE016 (frontend), per
  prior session's self-report:
  - Backend: 79 tests passing, excluding torch/Neo4j-dependent tests.
  - Frontend: builds cleanly, 0 lint errors.
  - F019 — graph export/import endpoints with WebSocket broadcast on change.
  - FE013 — routing shell (react-router-dom).
  - FE015 — auth forms wired to a `useAuth` hook with dual mock/live mode.
  - FE016 — export/import UI wired to F019.
- In progress: —
- Blocked: —
- **Unresolved critical issue (F020):** no auth enforcement on graph API
  routes — every endpoint is publicly reachable without a token, and `Node`
  has no `owner_id`, so all users currently share one graph. This was the
  explicit top priority carried into the next session and is still open.
- Learnings carried forward (see `conventions.md` / `DECISIONS.md` for full
  detail):
  - Deliver complete files via tools, never chat-pasted diffs — manual
    copy/paste has repeatedly corrupted files.
  - Start every session by cloning the repo fresh; don't trust the last
    progress note's "complete" claims without re-running verification.
  - Prefer real build/test runs (`pytest`, `npm run build`, `ruff`, `mypy`)
    over reasoning from code alone.
  - Make surgical edits; preserve existing patterns (dual mock/live hooks,
    dependency-override auth tests, `str_replace` over full rewrites).

## Session — 2026-08-16 (harness documentation reconstruction)
- Completed: filled in `architecture.md`, `conventions.md`, `verification.md`,
  `DECISIONS.md`, and `feature_list.json` from the project description and
  the memory context supplied by the user. No code was touched.
- In progress: —
- Blocked: F009–F018 and FE001–FE012/FE014 could not be itemized accurately —
  the original feature-by-feature spec for those wasn't available, only the
  high-level project description. They're stubbed as `not_started` with a
  TODO to reconstruct from the actual repo rather than being guessed.
- Next session should:
  1. Clone `Azure06072005/braintodo` fresh and run the full verification
     pipeline (`verification.md`) to confirm which of F001–F019/FE013/FE015/FE016
     are *actually* passing, not just reported-passing.
  2. Reconstruct the real F009–F018 / FE001–FE012,FE014 entries from the
     repo's router/page/component list.
  3. Resume work on **F020** (auth enforcement + `owner_id` on `Node`) —
     this remains the top open priority and the only feature marked `active`.

<!--
Template for future entries:

## Session N — YYYY-MM-DD
- Completed: F0xx (name) — all tests passing, evidence: commit <hash>
- In progress: F0yy (name) — what's done, what's left
- Blocked: (dependency / decision needed, or "none")
- Next session should: <one concrete next action>
-->