# Progress Log (Claude sessions) — braintodo

Update this at the end of every session (Principle 5 & 12). This is what the
next session reads to avoid starting from zero.

## Session — 2026-08-19 (incident: F001/F003 corruption in feature_list.json, restored)

Started from a fresh clone of `main` (`b00fb30`, PR #31 merged), which
includes the prior session's (2026-08-21 entry below — session dates in
this log aren't strictly chronological, see that entry) EdgeForm fix and
LandingPage/VerifyEmailPage/NodeDetailPanel/SearchBar/ImportExportControls
/AppPage tests.

Independently re-verified all of that before touching anything, not
trusting the prior session's report: `pytest` fast suite → 92 passed.
`ruff check .` → clean. `mypy src tests` → 84 files, 0 issues. `npm run
test` → 13 files, 69 passed (exact match). `npm run build` → 610 modules.
`npm run lint` → 0/0, 37 files. All confirmed genuinely green.

**Found a real bug in `feature_list.json` itself** (not in the product):
a routine "list every id, check for duplicates" sanity check — done
specifically because the prior session's `feature_list.json` edits
weren't independently re-inspected structurally, only trusted by summary —
turned up two duplicate ids: `FE001` and `FE003` each appeared twice. Both
duplicates were byte-for-byte identical (the real Landing-page and
Email-verification-page entries). Tracing it back: commit `8d6979a`
("update components") had accidentally **overwritten** the existing `F001`
(Node CRUD) and `F003` (Text embedding pipeline) entries' `id` fields to
`"FE001"`/`"FE003"` instead of appending the new entries alongside them —
destroying the original F001/F003 tracking entries entirely. The
underlying features were never actually broken (`pytest
tests/test_nodes.py` and the embedding tests were passing the whole time)
— this was purely a harness-file bug, but a real one: F001 and F003 were
untracked and would have stayed that way indefinitely if this session
had just trusted the "all frontend tests passing" summary without
checking the raw id list.

Fixed: restored `F001`/`F003` verbatim from the last known-good commit
(`6fc366f`, immediately before the corruption), independently re-verified
their tests still pass (not just trusted the restored content), and
removed the duplicate `FE001`/`FE003` entries. Full incident writeup in
`Decisions.md` ("2026-08-19: Incident — F001/F003 ids overwritten...").

- Completed: `feature_list.json` corruption fixed, F001/F003 restored, no
  duplicate ids remain (verified: 35 unique entries, one per F*/FE* id).
- In progress: —
- Blocked: —
- Next session should:
  1. Whenever editing `feature_list.json`, end with an explicit
     `[f["id"] for f in features]` duplicate/completeness check before
     considering the edit done — this incident happened specifically
     because that check wasn't part of the prior session's workflow.
  2. `GraphCanvas` (FE008) is still the only untested frontend piece — its
     entry got simplified to `not_started`/`verification: "TBD"` at some
     point (from a more detailed `active` entry with a documented scoping
     plan); worth deciding whether to restore that detail or leave the
     simpler version now that this is the *only* remaining gap.
  3. F013 (`/ws`) still isn't per-user scoped — flagged for several
     sessions running now, still not fixed.
  4. The torch/Neo4j-dependent backend tests remain unverified end to end
     by any session so far.

## Session — 2026-08-21 (EdgeForm Fix, Full Component & Page Tests, Harness Updates & Vercel Verification)
- Completed:
  - Fixed `frontend/src/components/EdgeForm.jsx` bug where initial `targetId` collided with `sourceId` on opening without pre-selection.
  - Added unit test suites: `LandingPage.test.jsx` (2 tests), `VerifyEmailPage.test.jsx` (3 tests), `NodeDetailPanel.test.jsx` (6 tests), `SearchBar.test.jsx` (6 tests), `ImportExportControls.test.jsx` (6 tests), `src/pages/AppPage.test.jsx` (8 tests).
  - Fixed `vercel.json` configuration paths from `braintodo-frontend` to `frontend`.
  - Itemized `F009-F018` into individual passing features and updated `FE001`, `FE003`, `FE007`, `FE011`, `FE012`, `FE014` as `passing` in `feature_list.json`.
  - Updated `Decisions.md` with EdgeForm state resolution and GraphCanvas test stubbing rationale.
- Verification evidence:
  - Frontend: `npm run test` (13 files passed, 69/69 passed), `npm run build` (610 modules transformed), `npm run lint` (0 warnings, 0 errors across 37 files).
  - Backend: `pytest` (107 passed, 1 skipped), `ruff check .` (clean), `mypy src tests` (0 errors in 84 files).
- Next session should:
  1. Add tests for `GraphCanvas.jsx` (FE008).
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