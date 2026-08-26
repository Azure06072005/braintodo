# Progress Log (Claude sessions) — braintodo

Update this at the end of every session (Principle 5 & 12). This is what the
next session reads to avoid starting from zero.

## Session — 2026-08-25 (FE021: NodeForm i18n migration)
- Continued the i18n migration plan (FE019/FE020) into `NodeForm.jsx` — the
  third component migrated, following the same pattern: add a
  `node_form` namespace to all 3 locale JSON files, swap hardcoded
  Vietnamese strings for `t(...)` calls, keep `vi` as the default so no
  existing test needs to change.
- Caught and fixed a small incidental bug while migrating: the tags-parsing
  callback (`form.tags.split(",").map((t) => t.trim())`) used `t` as its
  parameter name, which shadowed the newly-imported `t` translation
  function within that closure. Renamed the parameter to `tag`. This
  happened to be harmless here (the shadow only existed inside that one
  arrow function, which doesn't call the translation function), but is
  exactly the kind of naming collision that becomes a real bug the moment
  someone adds a `t(...)` call inside that same closure later - worth
  fixing now rather than leaving as a latent trap.
- Verification evidence:
  - Existing `NodeForm.test.jsx` (5 tests) required **zero** changes —
    passed unmodified, further confirming the FE019 default-context design
    holds for a third component in a row.
  - Added a 6th test mounting `NodeForm` under a real `<I18nProvider>`
    with `bt-locale=en` in `localStorage`, confirming the English labels
    and buttons actually render.
  - `npm run test` → **17 files, 103 passed** (up from 102 after FE020).
  - `npm run build` → 618 modules, clean.
  - `npm run lint` → 0 warnings / 0 errors, 46 files.
  - `I18nContext.test.jsx`'s "same set of keys across locales" structural
    test re-confirmed passing with the new `node_form.*` keys present in
    all 3 locale files.
  - `feature_list.json` integrity check: 41 unique ids, 0 duplicates
    (`FE021` added; nothing else touched).
  - Backend untouched this session (no backend files modified).
- Next session should:
  1. Continue the i18n migration: `EdgeForm`, `NodeDetailPanel`,
     `ImportExportControls`, and the auth/landing pages remain.
  2. Get Neo4j running via docker and finally execute `test_neo4j_store.py`
     (long-carried-over from the F021 backend session).
  3. Full `docker-compose` stack still never run end-to-end.
  4. If a future session runs on a machine with real internet access,
     verify `SentenceTransformerProvider`'s actual happy path against the
     real huggingface.co model (still never exercised, only its fake
     fallback has been verified).

## Session — 2026-08-25 (FE017-FE020: React Loop Fix, Mock Clusters, i18n System & 40/40 Passing)
- Completed:
  - Fixed React #185 infinite loop bug (FE017) via `useCallback` on hook functions and `useMemo` on return object in `frontend/src/hooks/useGraphData.js`.
  - Implemented dynamic mock cluster recomputation (FE018) via Union-Find connected components in `frontend/src/clustering/mockClustering.js`.
  - Built multi-language i18n foundation (FE019) with `vi.json`, `en.json`, `ja.json`, `translations.js`, `context.js`, `useTranslation.js`, and `I18nContext.jsx`.
  - Wired i18n into UI components (FE020): `TopBar.jsx` language selector, `SearchBar.jsx` localized results, and `AppPage.jsx` localized alerts.
  - Added unit test suites for all new components (17 test files, 102/102 passed).
  - Fixed mypy typing error on `SentenceTransformerProvider.dimension` (`int(dim or 384)`).
  - Added FE017-FE020 to `Harness/feature_list.json` (40 unique features, all passing, 0 duplicates) and recorded design choices in `Harness/Decisions.md`.
- Verification evidence:
  - Frontend: `npm run test` (17 files, 102 passed), `npm run build` (618 modules, clean), `npm run lint` (0/0, 46 files).
  - Backend: `pytest` (118 passed, 1 skipped), `ruff check .` clean, `mypy src tests` 0 errors across 85 files.
- Next session should:
  1. Complete live Docker Compose multi-service integration validation.

## Session — 2026-08-24 (F021: Real full-suite run w/ torch installed; found + fixed silent offline embedding-provider bug)
- Started by doing something no prior session had actually done: installed
  the real heavy deps (`torch`, `torch-geometric`, `sentence-transformers`)
  into a fresh venv and ran the genuinely full `pytest -x -q` (not the
  fast/excluded suite). Result: 113 passed, 1 skipped (`test_neo4j_store.py`
  self-skips correctly — no live Neo4j reachable in this sandbox).
- That full run stayed green, but investigating *why* the GNN/embedding
  tests never needed torch turned up a real, previously-invisible bug:
  `get_embedder()` in `src/braintodo/api/nodes.py` always hardcoded the real
  `SentenceTransformerProvider`, which downloads model weights from
  `huggingface.co` on first use with **no fallback and no config knob**.
  Every single test in the suite overrides `get_embedder` with
  `FakeEmbeddingProvider`, so this production code path had never been
  exercised by anything, ever. Confirmed directly: in this network-restricted
  sandbox, `get_sentence_transformer_provider()` raises a raw
  `OSError: We couldn't connect to 'https://huggingface.co'...` — meaning
  F001 (Node CRUD, marked `passing`) would 500 on every `POST /nodes` in any
  offline/restricted deploy, invisibly, because tests never touch this path.
- **Fix (F021)**:
  - Added `embedding_provider` (`"sentence_transformer"` default | `"fake"`)
    and `sentence_transformer_model` settings to `src/braintodo/config.py`.
  - `get_embedder()` in `src/braintodo/api/nodes.py` now branches on
    `settings.embedding_provider`; unknown values raise a clear
    `RuntimeError` rather than silently falling through.
  - `SentenceTransformerProvider.__init__` now wraps the model-load `OSError`
    in an actionable `RuntimeError` explaining the network/HF_HOME
    requirement and pointing at `EMBEDDING_PROVIDER=fake` as the escape
    hatch, instead of surfacing a raw HF stack trace.
  - `get_sentence_transformer_provider()` now takes a `model_name` param
    (still `@lru_cache` singleton) so `settings.sentence_transformer_model`
    is actually respected.
  - Added `tests/test_embedding_provider_config.py` (5 tests) exercising
    `get_embedder()` directly (not via `dependency_overrides`) so a
    regression here would actually be caught: fake-provider selection,
    singleton caching, deterministic embedding, unknown-provider error, and
    the sentence-transformer-unreachable actionable-error path.
- Verification evidence:
  - `pytest tests/test_embedding_provider_config.py -v` → 5/5 passed.
  - Full suite after fix: `pytest -q` → **118 passed, 1 skipped** (up from
    113; no regressions).
  - Smoke-tested both directions through the *real* (non-test-override)
    dependency path: default config + unreachable HF → clean `RuntimeError`
    (previously raw `OSError`); `EMBEDDING_PROVIDER=fake` + real
    `POST /auth/register → verify → login → POST /nodes` flow → `201` with a
    real embedding vector returned.
  - `ruff check .` → clean.
  - `mypy src` → 1 pre-existing error (`SentenceTransformerProvider.dimension:
    int | None vs int` in `api/nodes.py`), confirmed via `git stash` to
    predate this session's changes — not introduced or fixed here, flagged
    below as still open.
  - `feature_list.json` integrity check: 36 unique ids, 0 duplicates (new
    `F021` entry added; nothing else touched).
- Still open (not addressed this session):
  1. Real Neo4j has still never been exercised by any session — needs
     `docker compose up -d neo4j` in an environment with docker access.
  2. Full `docker-compose` stack has never been run end-to-end.
  3. Pre-existing `mypy` error in `SentenceTransformerProvider.dimension`
     typing (`int | None` vs `int`) — unrelated to this session's fix,
     needs its own pass.
  4. If real (non-fake) semantic embeddings are wanted in a genuinely
     offline/restricted deploy, the actual fix is baking the HF model into
     the image at build time or documenting `HF_HOME` pre-caching — not
     addressed here since it needs a real network-enabled build step.
- Next session should:
  1. Get Neo4j running (docker) and actually execute `test_neo4j_store.py`
     for the first time.
  2. Decide on and implement the HF model pre-caching strategy for
     production if real embeddings (not the fake fallback) are required
     offline.
  3. Take a pass at the pre-existing `mypy` error in
     `sentence_transformer_provider.py`/`api/nodes.py`.

## Session — 2026-08-22 (FE008 GraphCanvas Tests, Live Auth Token Threading & 35/35 Features Passing)
- Completed:
  - Fixed live-mode auth token threading across `createApiClient`, `useGraphData`, and `AppPage.jsx`.
  - Added live-mode token regression tests to `frontend/src/hooks/useGraphData.test.js`.
  - Added SVGSVGElement width/height polyfill to `src/test/setup.js`.
  - Created `frontend/src/components/GraphCanvas.test.jsx` (9 tests) covering shape selection, edge lines, dangling edge filtering, node labels, click handlers, cluster hulls, and clean unmount.
  - Flipped `FE008` (GraphCanvas) to `passing` in `feature_list.json` — all 35 features in the project are now `passing`.
  - Documented decisions in `Decisions.md`.
- Verification evidence:
  - Frontend: `npm run test` (14 files, 80 passed), `npm run build` (610 modules), `npm run lint` (0/0, 38 files).
  - Backend: `pytest` (113 passed, 1 skipped), `ruff check .` clean, `mypy src tests` 0 errors.
  - Feature list integrity: 35 unique IDs, all passing, 0 duplicates.
- Next session should:
  1. Perform end-to-end integration testing with Docker Compose services.

## Session — 2026-08-22 (F013 Realtime WebSocket Auth & Per-User Scoping)
- Completed:
  - Scoped `/ws` broadcasts per owner in `ConnectionManager` (`src/braintodo/realtime/manager.py`).
  - Authenticated `/ws` via `token` query param in `src/braintodo/api/realtime.py` (rejects with close code 1008 if unauthenticated).
  - Threaded `owner_id` to all `manager.broadcast()` calls in `nodes.py`, `edges.py`, and `graph.py`.
  - Rewrote `tests/test_realtime_manager.py` (5 tests) and `tests/test_realtime_api.py` (8 tests) with cross-user isolation and rejection tests.
  - Updated `tests/test_graph_export_import.py` to authenticate WebSocket handshake.
  - Updated `Harness/feature_list.json` and `Harness/Decisions.md`.
- Verification evidence:
  - Backend: `pytest tests/test_realtime_api.py tests/test_realtime_manager.py tests/test_graph_export_import.py` (14 passed), fast suite 98 passed, full suite 113 passed. `ruff check .` clean, `mypy src tests` 0 errors.
  - Frontend: `npm run test` (13 files, 69 passed), `npm run build` (610 modules), `npm run lint` (0/0).
- Next session should:
  1. Add tests for `GraphCanvas.jsx` (FE008).
  2. Perform end-to-end testing with Docker Compose services.

>>>>>>> Stashed changes
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