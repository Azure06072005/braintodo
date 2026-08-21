# Progress Log (Claude sessions) — braintodo

Update this at the end of every session (Principle 5 & 12). This is what the
next session reads to avoid starting from zero.

## Session — 2026-08-21 (EdgeForm Fix, Component Tests, Harness Updates & Vercel Verification)
- Completed:
  - Fixed `frontend/src/components/EdgeForm.jsx` bug where initial `targetId` collided with `sourceId` on opening without pre-selection.
  - Added unit test suites: `SearchBar.test.jsx` (6 tests), `ImportExportControls.test.jsx` (6 tests), `src/pages/AppPage.test.jsx` (8 tests).
  - Fixed `vercel.json` configuration paths from `braintodo-frontend` to `frontend`.
  - Updated `feature_list.json` marking `FE007`, `FE012`, `FE014` as `passing`.
  - Updated `Decisions.md` with EdgeForm state resolution and GraphCanvas test stubbing rationale.
- Verification evidence:
  - Frontend: `npm run test` (10 files passed, 58/58 passed), `npm run build` (610 modules transformed), `npm run lint` (0 warnings, 0 errors).
  - Backend: `pytest` (107 passed, 1 skipped), `ruff check .` (clean), `mypy src tests` (0 errors in 84 files).
- Next session should:
  1. Add tests for remaining frontend components (`GraphCanvas.jsx`, `TopBar.jsx`, `NodeDetailPanel.jsx`).
  2. Perform end-to-end testing with Docker Compose services.

## Session — 2026-08-19 (Frontend Test Suite & Feature Verification)
- Completed: Vitest configuration, jsdom setup, and component/hook unit tests.
  - Setup: [setup.js](file:///D:/AI/braintodo/frontend/src/test/setup.js) with `MemoryStorage`, `crypto.randomUUID`, and `FakeWebSocket` stubs.
  - Tests passing (7 files, 38/38 tests):
    - `src/pages/RegisterPage.test.jsx` (FE002, 2 tests)
    - `src/pages/LoginPage.test.jsx` (FE004, 3 tests)
    - `src/hooks/useAuth.test.js` (FE005, 6 tests)
    - `src/hooks/useGraphData.test.js` (FE006, 11 tests)
    - `src/components/NodeForm.test.jsx` (FE009, 5 tests)
    - `src/components/EdgeForm.test.jsx` (FE010, 5 tests)
    - `src/data/mockData.test.js` (6 tests)
  - Accessibility: Form inputs nested inside `<label>` in `NodeForm.jsx` and `EdgeForm.jsx`.
  - Feature list: FE002, FE004, FE005, FE006, FE009, FE010 marked `passing` in `Harness/feature_list.json`.
- In progress: —
- Blocked: —
- Verification evidence:
  - Frontend: `npm run test` (7 passed, 38 passed), `npm run build` (610 modules transformed), `npm run lint` (0 warnings, 0 errors).
  - Backend: `pytest` (107 passed, 1 skipped), `ruff check .` (clean), `mypy src tests` (0 errors in 84 files).
- Next session should:
  1. Add tests for remaining frontend components (`GraphCanvas.jsx`, `SearchBar.jsx`, `TopBar.jsx`, `NodeDetailPanel.jsx`).
  2. Perform end-to-end testing with Docker Compose services.

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
- **F020 completed**: Auth enforcement + per-user graph isolation implemented and verified (107 tests passing).
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