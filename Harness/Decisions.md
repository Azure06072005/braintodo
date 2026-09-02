# Design Decisions — braintodo

# Design Decisions — braintodo

## 2026-09-01: Incident — fe_feature_list.json corrupted by a wholesale-pasted proposal, fixed; FE028-031 renumbered
- What happened: an earlier speculative feature proposal (4 frontend
  features drafted in a planning conversation, not yet implemented) got
  pasted into `Harness/fe_feature_list.json` as a single **nested list**
  occupying one slot in the top-level `features` array, instead of being
  merged in as 4 separate top-level entries. Same root-cause shape as the
  2026-08-19 `F001`/`F003` incident: a mechanical copy operation that didn't
  preserve the file's flat-array structure. Caught the same way that
  incident was caught - inspecting the actual `features` list structurally
  (`isinstance(f, dict)` for every entry) before trusting it, rather than
  assuming the file was well-formed because it parsed as valid JSON.
  Valid-JSON is not the same as well-formed-per-this-file's-schema.
- Impact: `FE028`-`FE031` existed in the file (under the nested list) but
  were unreachable by any tooling that assumes `features` is a flat list of
  objects - e.g. any script computing `[f["id"] for f in features]` for the
  duplicate-check this project's own convention requires would have crashed
  (as it did here) rather than silently passing, so this was caught before
  it could cause silent data loss.
- Fix: flattened the nested list back into 4 top-level entries. Separately,
  those 4 placeholder entries (`FE028` TaskListPage, `FE029` TaskQuickAdd,
  `FE030` Daily summary board, `FE031` Task<->Node linker) were all still
  `not_started` - nothing had been built against them - so when new, more
  specific frontend work was scoped under the same numbers with different
  names (`FE028` NodeDetailPanel task UI, `FE029` Task filters, `FE030`
  Daily task views), they were redefined rather than kept as dead
  placeholders alongside real duplicates-in-spirit. The two placeholder
  concepts that didn't get folded into the new definitions
  (`TaskQuickAdd`, `Task<->Node linker`) were preserved, renumbered to
  `FE032`/`FE033` so no future work idea was silently dropped.
- Constraint: same as the 2026-08-19 incident's constraint, extended -
  before trusting either `*_feature_list.json` file, check not just for
  duplicate/missing ids but that every entry in `features` is actually a
  flat object (`all(isinstance(f, dict) for f in features)`). A file that
  loads as valid JSON can still be structurally corrupt in a way that only
  shows up when something tries to iterate it as a flat list.

## 2026-09-01: F027 session — incidental fix: WebSocket broadcasts were silently dropping non-JSON-serializable payloads
- What happened: adding `Node.created_at` (a real `datetime`, always populated
  via `default_factory`, not an optional field like `due_date`/`completed_at`)
  meant *every* node - including plain idea-nodes - now carried a raw
  `datetime` object into `node.model_dump()`. That dict is passed straight to
  `ConnectionManager.broadcast()`, which calls `websocket.send_json()`
  (stdlib `json.dumps` under the hood). A raw `datetime` isn't JSON
  serializable, so every single broadcast started raising `TypeError` -
  but `ConnectionManager.broadcast()`'s `except Exception` treated that as
  "client disconnected" and silently dropped the connection instead of
  raising. Every caller awaiting a broadcast succeeded (the REST response
  came back 201 fine); every WebSocket client waiting on that event hung
  forever. Caught because `tests/test_realtime_api.py` timed out during this
  session's full-suite run instead of failing fast - traced via
  `pytest-timeout`'s stack dump to `ws.receive_json()` blocking forever.
- Impact assessment: this was a **latent bug from F024**, not new to F027 -
  `due_date`/`completed_at` are also raw `date`/`datetime` on the wire, but
  both defaulted to `None` (JSON-serializable), so no F024/F025 test ever
  populated a non-None date/datetime field on a node that also had a
  WebSocket listener attached, and the bug stayed invisible until
  `created_at`'s non-optional default made it unconditional.
- Fix (two parts, both necessary):
  1. Every `manager.broadcast(..., x.model_dump(), ...)` call site
     (`api/nodes.py`, `api/edges.py`, `api/graph.py`) now uses
     `x.model_dump(mode="json")`, which lets Pydantic convert
     date/datetime/etc. to JSON-safe values before they ever reach
     `send_json`.
  2. `ConnectionManager.broadcast()`'s bare `except Exception` was narrowed
     to `except (WebSocketDisconnect, RuntimeError)` - the actual exception
     shapes for a genuinely dead client - so a future serialization bug (or
     any other real bug) raises loudly instead of being misclassified as a
     dead connection and hanging every caller.
- Constraint: any new Node/Edge/response field with a non-JSON-native Python
  type (date, datetime, UUID, Decimal, etc.) must be exercised by at least
  one test that also has a WebSocket listener attached (see
  `test_realtime_api.py`'s pattern), not just a plain REST round-trip test -
  a REST-only test would have kept missing this class of bug indefinitely.

## 2026-09-01: F028 — recurrence requires a due_date to anchor to; advances from the completed occurrence's due_date, not "today"
- Reason: a recurring task with no `due_date` has nothing to compute a next
  occurrence relative to. Two options existed: guess (anchor to "today") or
  skip. Guessing was rejected - it would make a task's rhythm depend on
  *when it happened to get completed* rather than its schedule, which is
  exactly the bug a recurrence feature is supposed to prevent (a task due
  "every Monday" should stay anchored to Mondays even if completed late).
- Fix: `_advance_due_date(due_date, rule)` computes the next date purely
  from the prior `due_date` (+1 day / +7 days / +1 calendar month, clamped
  to the target month's real last day for `monthly` - e.g. Jan 31 -> Feb 28
  in a non-leap year). Completing a `recurrence_rule`-set task with
  `due_date is None` creates nothing.
- Rejected: an RRULE-style recurrence string for more flexible schedules
  (e.g. "every 2nd Tuesday") - out of scope for this feature's stated
  behavior (daily/weekly/monthly enum), and would be premature complexity
  before any real usage demands it.
- Constraint: the new instance is created via `NodeRepository.create()`
  (the full creation path, including embedding computation), not by calling
  the store directly - so a recurring task-node gets the same embedding/
  clustering treatment as any other node, per this project's existing
  "GNN logic stays generic, don't special-case node types in routers/stores"
  convention.

## 2026-09-01: F026 — naive date.today()/datetime.now() banned by ruff (DTZ), use tz-aware equivalents
- Reason: ruff's DTZ011 rule flagged `date.today()` in both the new
  `/tasks/today` implementation and its tests - this project already
  standardizes on `datetime.now(UTC)` elsewhere (F013's realtime timestamps,
  F024/F025's `completed_at`), so naive `date.today()` was inconsistent with
  that, not just a lint nag.
- Fix: `datetime.now(UTC).date()` everywhere a "what day is it" comparison
  is needed, including in tests (which also switched from a hardcoded date
  string to a value computed relative to "now", so the suite doesn't start
  silently failing on a future run date).
- Constraint: any new code comparing against "today" should use
  `datetime.now(UTC).date()`, not `date.today()` - keep it consistent with
  the rest of the codebase's UTC-aware timestamp convention.

## 2026-09-01: F025 — completion/reopen via dedicated store methods, not NodeUpdate
- Reason: `InMemoryGraphStore.update_node` and `Neo4jGraphStore.update_node`
  both call `data.model_dump(exclude_unset=True, exclude_none=True)`, so an
  explicit `NodeUpdate(completed_at=None)` is indistinguishable from "field
  not touched" - the None is dropped before it reaches either store. A
  "reopen" operation needs to genuinely clear the field, which the existing
  update path structurally cannot do.
- Fix: added `complete_node`/`reopen_node` to the `GraphStore` Protocol as
  first-class operations, implemented directly in each store rather than
  routed through `NodeUpdate`. `Neo4jGraphStore.reopen_node` uses Cypher
  `REMOVE n.completed_at` rather than `SET n.completed_at = null` - Neo4j
  properties are either present or absent, there is no null-valued property
  state to set.
- Rejected: adding a `clear_fields: list[str]` escape hatch to `NodeUpdate`
  generically - broader than this feature needs, and would let a normal
  `PATCH /nodes/{id}` body silently disagree with itself (e.g. a field both
  set and listed to clear) for no in-scope benefit.
- Constraint: any future field that needs "explicitly clear back to unset"
  semantics (not just "leave untouched") needs its own dedicated store
  method, following this precedent - it cannot go through `NodeUpdate`'s
  `exclude_none` path.


- Reason: `AGENTS.md`/`Architecture.md` describe a two-store split (Neo4j
  structure, Postgres relational/auth), which suggested a migration might be
  needed. Checked `src/braintodo/db/models.py` directly before writing any
  code: Postgres only holds `User`/`EmailVerificationToken`. `Node` has no
  Postgres table at all - it's persisted entirely by whichever `GraphStore`
  is active (`Neo4jGraphStore` in production, `InMemoryGraphStore` in
  tests), and both call `node.model_dump()` generically rather than
  enumerating fields. So adding `node_type`/`due_date`/`priority`/
  `completed_at`/`recurrence_rule` to the `Node`/`NodeCreate`/`NodeUpdate`
  Pydantic models was sufficient - no `alembic revision` needed.
- Caveat (not yet exercised): Neo4j's Cypher driver silently omits
  null-valued properties from a `CREATE (n $props)` / `SET n += $updates`
  map rather than erroring, so `due_date: null` on an idea-node create
  should just not set the property. This matches existing precedent
  (`embedding`/`graph_embedding` are already nullable and go through the
  same path) but has never been confirmed against a real Neo4j instance in
  any session so far (`test_neo4j_store.py` self-skips without one) -
  flagging so a future session with live Neo4j access verifies it rather
  than assuming.
- Constraint: any future Node field should default to keeping
  `NodeCreate`/`Node` construction working with the field entirely omitted
  from the request - this is what let F024 land with zero API-layer or
  store-layer code changes, only model changes.


Log of deliberate, non-obvious choices so a future session doesn't reverse
one without a new reason. Newest at the top. Dates below are the date this
log entry was written (reconstructed from prior session summaries); the
underlying decisions were made in earlier sessions whose exact dates weren't
recorded — fix the dates if you have the real commit history.

## 2026-08-24: EMBEDDING_PROVIDER config + fake fallback for offline/restricted deploys
- Reason: `get_embedder()` in `src/braintodo/api/nodes.py` always hardcoded
  the real `SentenceTransformerProvider`, which downloads model weights from
  huggingface.co on first use. Every test in the suite overrides
  `get_embedder` with `FakeEmbeddingProvider`, so this was never actually
  exercised — a network-restricted or offline deploy would 500 on every
  `POST /nodes` despite F001 being marked `passing` and the full suite being
  green. Discovered this session while running the genuinely full suite with
  torch/torch-geometric/sentence-transformers installed for the first time.
- Fix: `embedding_provider` setting (`"sentence_transformer"` default |
  `"fake"`) on `Settings`; `get_embedder()` branches on it; unknown values
  raise `RuntimeError` rather than silently defaulting. Model-load `OSError`
  in `SentenceTransformerProvider` is now wrapped in an actionable
  `RuntimeError` pointing at `EMBEDDING_PROVIDER=fake` as the escape hatch,
  instead of surfacing a raw connection stack trace.
- Rejected: silently catching the `OSError` and falling back to the fake
  provider automatically — this would silently degrade embedding quality in
  production without anyone noticing (a misconfigured deploy would just get
  worse embeddings, not an error). Explicit opt-in via
  `EMBEDDING_PROVIDER=fake` was chosen so the fallback is a deliberate,
  visible choice, not a silent one.
- Constraint: any new `EmbeddingProvider` implementation should be wired
  through this same `settings.embedding_provider` switch rather than adding
  another hardcoded default in `api/nodes.py`. Tests should exercise
  `get_embedder()` directly (see `tests/test_embedding_provider_config.py`)
  rather than only relying on `dependency_overrides`, so real
  production-path bugs like this one don't stay invisible again.

## 2026-08-22: Live-mode Auth Token Threading in useGraphData & AppPage
- Reason: REST API routes (F020) and `/ws` realtime broadcasts (F013) enforce authentication. Threading `token` from `useAuth()` in `AppPage.jsx` into `useGraphData(source, undefined, token)` and `createApiClient(baseUrl, token)` ensures REST calls attach `Authorization: Bearer <token>` and WebSocket connects with `/ws?token=<token>`.
- Constraint: Live-mode API hooks must accept and pass auth tokens from auth state.

## 2026-08-22: GraphCanvas Structural SVG Testing Scope & jsdom SVGSVGElement Polyfill
- Reason: D3 force simulation animates asynchronously over multiple frames and d3-drag accesses mouse event window views not fully implemented in jsdom. Component tests focus on synchronous SVG structural invariants (circle/rect counts, lines, dangling edge filtering, labels, cluster hull paths, click handlers via `fireEvent.click`, and unmount cleanup).
- Polyfill: `SVGSVGElement.prototype.width/height` polyfill in `src/test/setup.js` provides `baseVal.value` fallbacks for `d3-zoom` in jsdom.
- Constraint: Canvas tests assert structural DOM presence rather than simulated floating-point coordinates.

## 2026-08-22: F013 — /ws authenticated via token query param and scoped per-owner
- Reason: WebSocket handshakes initiated by browser JavaScript cannot include custom HTTP headers (such as `Authorization: Bearer <token>`). Passing the standard JWT access token via `ws://host/ws?token=<access_token>` query parameter allows authenticating the user during handshake without requiring extra handshake protocols.
- Scoping: `ConnectionManager` tags each active WebSocket with the authenticated `owner_id`. `broadcast()` filters recipient sockets to matching `owner_id`, closing the data-isolation gap where one user's graph edits were previously broadcast to all connected clients.
- Tradeoff: Query parameters can be logged by reverse proxies / access logs. Accepted as the standard tradeoff for browser WebSocket authentication without introducing cookie/session infrastructure.
- Constraint: Unauthenticated or expired token connections are closed immediately with WebSocket close code 1008 (policy violation) before `accept()`.

## 2026-08-19: Incident — F001/F003 ids overwritten by FE001/FE003 in feature_list.json, restored
- What happened: commit `8d6979a` ("update components") added the real
  `FE001` (Landing page) and `FE003` (Email verification page) entries, but
  in doing so **overwrote** the existing `F001` (Node CRUD) and `F003`
  (Text embedding pipeline) entries' `id` fields to `"FE001"`/`"FE003"`
  instead of appending new entries — destroying the original F001/F003
  tracking entries entirely and leaving two duplicate `FE001`/`FE003` ids
  in the file (byte-for-byte identical Landing/VerifyEmail entries). Most
  likely cause: a find/replace or manual edit that matched on the wrong
  scope. This was caught by a routine "list all ids, check for duplicates"
  sanity check before trusting a prior session's `feature_list.json`
  report — the duplicate ids were the tell.
- Impact: F001 and F003 silently disappeared from tracking even though
  the underlying features were never broken (`pytest tests/test_nodes.py`
  and the embedding pipeline tests were still passing the whole time,
  confirmed on re-verification) — this was a bug in the *harness*, not in
  the product.
- Fix: restored `F001`/`F003` verbatim from the last known-good commit
  (`6fc366f`, before the corruption), re-verified their tests still pass
  independently rather than trusting the restored content blindly, and
  removed the duplicate `FE001`/`FE003` entries.
- Rejected: silently deleting the duplicates without restoring F001/F003 -
  would have "fixed" the duplicate-id symptom while still leaving two real
  features permanently untracked.
- Constraint: **any session that edits `feature_list.json` should end by
  checking `[f["id"] for f in features]` has no duplicates and covers every
  expected F*/FE* id**, not just spot-checking the entries it touched. A
  duplicate or missing id in this file is exactly the kind of silent
  corruption that's easy to introduce with a careless string replacement
  and easy to miss without an explicit check.

## 2026-08-21: EdgeForm initial target node derivation from resolved initialSourceId
- Reason: When `defaultSourceId` is null (e.g. user clicks "+ Liên kết" without pre-selecting a node), `sourceId` defaults to `nodes[0]?.id`. Filtering `nodes.find(n => n.id !== defaultSourceId)` checked against `null` (matching `nodes[0]`), causing `sourceId === targetId` and failing form validation immediately. Resolving `initialSourceId = defaultSourceId || nodes[0]?.id || ""` first and finding `nodes.find(n => n.id !== initialSourceId)` guarantees distinct source and target defaults whenever `>= 2` nodes exist.
- Constraint: Form default states with inter-field uniqueness constraints must evaluate resolved defaults, not uncoerced props.

## 2026-08-21: Lightweight GraphCanvas stub in AppPage orchestration tests with real useGraphData
- Reason: GraphCanvas is D3/SVG-heavy and tested separately for visual geometry. AppPage tests focus on orchestration (modals, search wiring, delete confirmation, mock/live source reset) against the real `useGraphData("mock")` hook without mock pollution.
- Constraint: Page orchestration tests stub visual canvas components but execute real hook and state management logic.

## 2026-08-17: Accessible form input nesting inside `<label>`
- Reason: Wrapping `<input>` and `<select>` children directly inside `<label>` in `Field` helper components (`NodeForm.jsx`, `EdgeForm.jsx`) ensures accessible label association without requiring explicit `id`/`htmlFor` boilerplate across dynamically instantiated form controls.
- Rejected: Manually generating unique `htmlFor` / `id` strings for every form field or leaving labels detached.
- Constraint: Future form components should nest input controls inside `<label>` or ensure explicit `htmlFor` association for accessibility and standard `@testing-library/react` `getByLabelText` compatibility.

## 2026-08-17: Anchor `.gitignore` data rules to root (`/data/`, `/datasets/`)
- Reason: Bare `data/` rule inadvertently ignored `frontend/src/data/mockData.js`, causing mock datasets and their tests to disappear from version control.
- Rejected: Unanchored `data/` wildcard.
- Constraint: Data directories must be anchored as `/data/` and `/datasets/` in root `.gitignore`.

## 2026-08-17: Vitest + jsdom with lightweight browser API fakes
- Reason: Unit and component tests need rapid execution in jsdom without running a real browser or spinning up the live backend/WebSocket servers. `MemoryStorage`, `crypto.randomUUID`, and `FakeWebSocket` stubs in `src/test/setup.js` provide full hook and UI testability while preventing import chain crashes in jsdom.
- Rejected: Heavy browser test harnesses (Cypress/Playwright) for unit logic or skipping mock-mode test coverage.
- Constraint: Frontend test suite lives under `vitest run` with jsdom environment configured in `vite.config.js` and `src/test/setup.js`.

## 2026-08-16: Always deliver complete files, never chat-pasted diffs
- Reason: manual copy-paste from chat repeatedly corrupted files (truncated
  replacements, transcription typos like `ndoes` → `nodes`).
- Rejected: relying on the user to copy/merge diffs by hand.
- Constraint: all future sessions must use file-creation/`str_replace` tools
  for anything the user will save, not chat-message code blocks.

## 2026-08-16: Two-database split — Neo4j for graph, Postgres for relational/auth
- Reason: Neo4j gives native graph traversal/Cypher for the knowledge-graph
  core; Postgres handles relational concerns (users, auth, migrations via
  Alembic) that don't map naturally onto a graph store.
- Rejected: single-store designs (Neo4j-only or Postgres-only with an
  adjacency-list table) — Neo4j-only would make relational/auth queries
  awkward; Postgres-only would make graph traversal and GNN data loading slow.
- Constraint: any feature touching both "who owns this" and "how is this
  connected" (e.g. F020 auth enforcement + per-user graph isolation) has to
  reconcile state across both stores.

## 2026-08-16: PyTorch Geometric (PyG) over DGL for the GNN engine
- Reason: chosen as the GNN framework for embeddings, link prediction, and
  clustering (GCN/GAT/GraphSAGE).
- Rejected: DGL — noted as the alternative in the original project spec but
  not the one implemented.
- Constraint: GNN-related services and their dependencies (torch, torch-geometric)
  are isolated behind `services/`, and their tests are excluded from the
  default fast test suite (see `conventions.md`), so this choice doesn't slow
  down non-ML iteration.

## 2026-08-16: Fresh-clone verification at the start of every session
- Reason: prior sessions' "reported complete" state didn't always match
  actual repo state; trusting the last progress note without re-verifying led
  to wasted work.
- Rejected: trusting `claude-progress.md`/`gemini-progress.md` at face value.
- Constraint: every session starts with `git clone` + running the full
  verification pipeline (`verification.md`) before believing any prior
  "passing" claim.

## 2026-09-01: F027 session — incidental fix: WebSocket broadcasts were silently dropping non-JSON-serializable payloads
- What happened: adding `Node.created_at` (a real `datetime`, always populated
  via `default_factory`, not an optional field like `due_date`/`completed_at`)
  meant *every* node - including plain idea-nodes - now carried a raw
  `datetime` object into `node.model_dump()`. That dict is passed straight to
  `ConnectionManager.broadcast()`, which calls `websocket.send_json()`
  (stdlib `json.dumps` under the hood). A raw `datetime` isn't JSON
  serializable, so every single broadcast started raising `TypeError` -
  but `ConnectionManager.broadcast()`'s `except Exception` treated that as
  "client disconnected" and silently dropped the connection instead of
  raising. Every caller awaiting a broadcast succeeded (the REST response
  came back 201 fine); every WebSocket client waiting on that event hung
  forever. Caught because `tests/test_realtime_api.py` timed out during this
  session's full-suite run instead of failing fast - traced via
  `pytest-timeout`'s stack dump to `ws.receive_json()` blocking forever.
- Impact assessment: this was a **latent bug from F024**, not new to F027 -
  `due_date`/`completed_at` are also raw `date`/`datetime` on the wire, but
  both defaulted to `None` (JSON-serializable), so no F024/F025 test ever
  populated a non-None date/datetime field on a node that also had a
  WebSocket listener attached, and the bug stayed invisible until
  `created_at`'s non-optional default made it unconditional.
- Fix (two parts, both necessary):
  1. Every `manager.broadcast(..., x.model_dump(), ...)` call site
     (`api/nodes.py`, `api/edges.py`, `api/graph.py`) now uses
     `x.model_dump(mode="json")`, which lets Pydantic convert
     date/datetime/etc. to JSON-safe values before they ever reach
     `send_json`.
  2. `ConnectionManager.broadcast()`'s bare `except Exception` was narrowed
     to `except (WebSocketDisconnect, RuntimeError)` - the actual exception
     shapes for a genuinely dead client - so a future serialization bug (or
     any other real bug) raises loudly instead of being misclassified as a
     dead connection and hanging every caller.
- Constraint: any new Node/Edge/response field with a non-JSON-native Python
  type (date, datetime, UUID, Decimal, etc.) must be exercised by at least
  one test that also has a WebSocket listener attached (see
  `test_realtime_api.py`'s pattern), not just a plain REST round-trip test -
  a REST-only test would have kept missing this class of bug indefinitely.

## 2026-09-01: F028 — recurrence requires a due_date to anchor to; advances from the completed occurrence's due_date, not "today"
- Reason: a recurring task with no `due_date` has nothing to compute a next
  occurrence relative to. Two options existed: guess (anchor to "today") or
  skip. Guessing was rejected - it would make a task's rhythm depend on
  *when it happened to get completed* rather than its schedule, which is
  exactly the bug a recurrence feature is supposed to prevent (a task due
  "every Monday" should stay anchored to Mondays even if completed late).
- Fix: `_advance_due_date(due_date, rule)` computes the next date purely
  from the prior `due_date` (+1 day / +7 days / +1 calendar month, clamped
  to the target month's real last day for `monthly` - e.g. Jan 31 -> Feb 28
  in a non-leap year). Completing a `recurrence_rule`-set task with
  `due_date is None` creates nothing.
- Rejected: an RRULE-style recurrence string for more flexible schedules
  (e.g. "every 2nd Tuesday") - out of scope for this feature's stated
  behavior (daily/weekly/monthly enum), and would be premature complexity
  before any real usage demands it.
- Constraint: the new instance is created via `NodeRepository.create()`
  (the full creation path, including embedding computation), not by calling
  the store directly - so a recurring task-node gets the same embedding/
  clustering treatment as any other node, per this project's existing
  "GNN logic stays generic, don't special-case node types in routers/stores"
  convention.

## 2026-09-01: F026 — naive date.today()/datetime.now() banned by ruff (DTZ), use tz-aware equivalents
- Reason: ruff's DTZ011 rule flagged `date.today()` in both the new
  `/tasks/today` implementation and its tests - this project already
  standardizes on `datetime.now(UTC)` elsewhere (F013's realtime timestamps,
  F024/F025's `completed_at`), so naive `date.today()` was inconsistent with
  that, not just a lint nag.
- Fix: `datetime.now(UTC).date()` everywhere a "what day is it" comparison
  is needed, including in tests (which also switched from a hardcoded date
  string to a value computed relative to "now", so the suite doesn't start
  silently failing on a future run date).
- Constraint: any new code comparing against "today" should use
  `datetime.now(UTC).date()`, not `date.today()` - keep it consistent with
  the rest of the codebase's UTC-aware timestamp convention.

## 2026-09-01: F025 — completion/reopen via dedicated store methods, not NodeUpdate
- Reason: `InMemoryGraphStore.update_node` and `Neo4jGraphStore.update_node`
  both call `data.model_dump(exclude_unset=True, exclude_none=True)`, so an
  explicit `NodeUpdate(completed_at=None)` is indistinguishable from "field
  not touched" - the None is dropped before it reaches either store. A
  "reopen" operation needs to genuinely clear the field, which the existing
  update path structurally cannot do.
- Fix: added `complete_node`/`reopen_node` to the `GraphStore` Protocol as
  first-class operations, implemented directly in each store rather than
  routed through `NodeUpdate`. `Neo4jGraphStore.reopen_node` uses Cypher
  `REMOVE n.completed_at` rather than `SET n.completed_at = null` - Neo4j
  properties are either present or absent, there is no null-valued property
  state to set.
- Rejected: adding a `clear_fields: list[str]` escape hatch to `NodeUpdate`
  generically - broader than this feature needs, and would let a normal
  `PATCH /nodes/{id}` body silently disagree with itself (e.g. a field both
  set and listed to clear) for no in-scope benefit.
- Constraint: any future field that needs "explicitly clear back to unset"
  semantics (not just "leave untouched") needs its own dedicated store
  method, following this precedent - it cannot go through `NodeUpdate`'s
  `exclude_none` path.


- Reason: `AGENTS.md`/`Architecture.md` describe a two-store split (Neo4j
  structure, Postgres relational/auth), which suggested a migration might be
  needed. Checked `src/braintodo/db/models.py` directly before writing any
  code: Postgres only holds `User`/`EmailVerificationToken`. `Node` has no
  Postgres table at all - it's persisted entirely by whichever `GraphStore`
  is active (`Neo4jGraphStore` in production, `InMemoryGraphStore` in
  tests), and both call `node.model_dump()` generically rather than
  enumerating fields. So adding `node_type`/`due_date`/`priority`/
  `completed_at`/`recurrence_rule` to the `Node`/`NodeCreate`/`NodeUpdate`
  Pydantic models was sufficient - no `alembic revision` needed.
- Caveat (not yet exercised): Neo4j's Cypher driver silently omits
  null-valued properties from a `CREATE (n $props)` / `SET n += $updates`
  map rather than erroring, so `due_date: null` on an idea-node create
  should just not set the property. This matches existing precedent
  (`embedding`/`graph_embedding` are already nullable and go through the
  same path) but has never been confirmed against a real Neo4j instance in
  any session so far (`test_neo4j_store.py` self-skips without one) -
  flagging so a future session with live Neo4j access verifies it rather
  than assuming.
- Constraint: any future Node field should default to keeping
  `NodeCreate`/`Node` construction working with the field entirely omitted
  from the request - this is what let F024 land with zero API-layer or
  store-layer code changes, only model changes.


Log of deliberate, non-obvious choices so a future session doesn't reverse
one without a new reason. Newest at the top. Dates below are the date this
log entry was written (reconstructed from prior session summaries); the
underlying decisions were made in earlier sessions whose exact dates weren't
recorded — fix the dates if you have the real commit history.

## 2026-08-24: EMBEDDING_PROVIDER config + fake fallback for offline/restricted deploys
- Reason: `get_embedder()` in `src/braintodo/api/nodes.py` always hardcoded
  the real `SentenceTransformerProvider`, which downloads model weights from
  huggingface.co on first use. Every test in the suite overrides
  `get_embedder` with `FakeEmbeddingProvider`, so this was never actually
  exercised — a network-restricted or offline deploy would 500 on every
  `POST /nodes` despite F001 being marked `passing` and the full suite being
  green. Discovered this session while running the genuinely full suite with
  torch/torch-geometric/sentence-transformers installed for the first time.
- Fix: `embedding_provider` setting (`"sentence_transformer"` default |
  `"fake"`) on `Settings`; `get_embedder()` branches on it; unknown values
  raise `RuntimeError` rather than silently defaulting. Model-load `OSError`
  in `SentenceTransformerProvider` is now wrapped in an actionable
  `RuntimeError` pointing at `EMBEDDING_PROVIDER=fake` as the escape hatch,
  instead of surfacing a raw connection stack trace.
- Rejected: silently catching the `OSError` and falling back to the fake
  provider automatically — this would silently degrade embedding quality in
  production without anyone noticing (a misconfigured deploy would just get
  worse embeddings, not an error). Explicit opt-in via
  `EMBEDDING_PROVIDER=fake` was chosen so the fallback is a deliberate,
  visible choice, not a silent one.
- Constraint: any new `EmbeddingProvider` implementation should be wired
  through this same `settings.embedding_provider` switch rather than adding
  another hardcoded default in `api/nodes.py`. Tests should exercise
  `get_embedder()` directly (see `tests/test_embedding_provider_config.py`)
  rather than only relying on `dependency_overrides`, so real
  production-path bugs like this one don't stay invisible again.

## 2026-08-22: Live-mode Auth Token Threading in useGraphData & AppPage
- Reason: REST API routes (F020) and `/ws` realtime broadcasts (F013) enforce authentication. Threading `token` from `useAuth()` in `AppPage.jsx` into `useGraphData(source, undefined, token)` and `createApiClient(baseUrl, token)` ensures REST calls attach `Authorization: Bearer <token>` and WebSocket connects with `/ws?token=<token>`.
- Constraint: Live-mode API hooks must accept and pass auth tokens from auth state.

## 2026-08-22: GraphCanvas Structural SVG Testing Scope & jsdom SVGSVGElement Polyfill
- Reason: D3 force simulation animates asynchronously over multiple frames and d3-drag accesses mouse event window views not fully implemented in jsdom. Component tests focus on synchronous SVG structural invariants (circle/rect counts, lines, dangling edge filtering, labels, cluster hull paths, click handlers via `fireEvent.click`, and unmount cleanup).
- Polyfill: `SVGSVGElement.prototype.width/height` polyfill in `src/test/setup.js` provides `baseVal.value` fallbacks for `d3-zoom` in jsdom.
- Constraint: Canvas tests assert structural DOM presence rather than simulated floating-point coordinates.

## 2026-08-22: F013 — /ws authenticated via token query param and scoped per-owner
- Reason: WebSocket handshakes initiated by browser JavaScript cannot include custom HTTP headers (such as `Authorization: Bearer <token>`). Passing the standard JWT access token via `ws://host/ws?token=<access_token>` query parameter allows authenticating the user during handshake without requiring extra handshake protocols.
- Scoping: `ConnectionManager` tags each active WebSocket with the authenticated `owner_id`. `broadcast()` filters recipient sockets to matching `owner_id`, closing the data-isolation gap where one user's graph edits were previously broadcast to all connected clients.
- Tradeoff: Query parameters can be logged by reverse proxies / access logs. Accepted as the standard tradeoff for browser WebSocket authentication without introducing cookie/session infrastructure.
- Constraint: Unauthenticated or expired token connections are closed immediately with WebSocket close code 1008 (policy violation) before `accept()`.

## 2026-08-19: Incident — F001/F003 ids overwritten by FE001/FE003 in feature_list.json, restored
- What happened: commit `8d6979a` ("update components") added the real
  `FE001` (Landing page) and `FE003` (Email verification page) entries, but
  in doing so **overwrote** the existing `F001` (Node CRUD) and `F003`
  (Text embedding pipeline) entries' `id` fields to `"FE001"`/`"FE003"`
  instead of appending new entries — destroying the original F001/F003
  tracking entries entirely and leaving two duplicate `FE001`/`FE003` ids
  in the file (byte-for-byte identical Landing/VerifyEmail entries). Most
  likely cause: a find/replace or manual edit that matched on the wrong
  scope. This was caught by a routine "list all ids, check for duplicates"
  sanity check before trusting a prior session's `feature_list.json`
  report — the duplicate ids were the tell.
- Impact: F001 and F003 silently disappeared from tracking even though
  the underlying features were never broken (`pytest tests/test_nodes.py`
  and the embedding pipeline tests were still passing the whole time,
  confirmed on re-verification) — this was a bug in the *harness*, not in
  the product.
- Fix: restored `F001`/`F003` verbatim from the last known-good commit
  (`6fc366f`, before the corruption), re-verified their tests still pass
  independently rather than trusting the restored content blindly, and
  removed the duplicate `FE001`/`FE003` entries.
- Rejected: silently deleting the duplicates without restoring F001/F003 -
  would have "fixed" the duplicate-id symptom while still leaving two real
  features permanently untracked.
- Constraint: **any session that edits `feature_list.json` should end by
  checking `[f["id"] for f in features]` has no duplicates and covers every
  expected F*/FE* id**, not just spot-checking the entries it touched. A
  duplicate or missing id in this file is exactly the kind of silent
  corruption that's easy to introduce with a careless string replacement
  and easy to miss without an explicit check.

## 2026-08-21: EdgeForm initial target node derivation from resolved initialSourceId
- Reason: When `defaultSourceId` is null (e.g. user clicks "+ Liên kết" without pre-selecting a node), `sourceId` defaults to `nodes[0]?.id`. Filtering `nodes.find(n => n.id !== defaultSourceId)` checked against `null` (matching `nodes[0]`), causing `sourceId === targetId` and failing form validation immediately. Resolving `initialSourceId = defaultSourceId || nodes[0]?.id || ""` first and finding `nodes.find(n => n.id !== initialSourceId)` guarantees distinct source and target defaults whenever `>= 2` nodes exist.
- Constraint: Form default states with inter-field uniqueness constraints must evaluate resolved defaults, not uncoerced props.

## 2026-08-21: Lightweight GraphCanvas stub in AppPage orchestration tests with real useGraphData
- Reason: GraphCanvas is D3/SVG-heavy and tested separately for visual geometry. AppPage tests focus on orchestration (modals, search wiring, delete confirmation, mock/live source reset) against the real `useGraphData("mock")` hook without mock pollution.
- Constraint: Page orchestration tests stub visual canvas components but execute real hook and state management logic.

## 2026-08-17: Accessible form input nesting inside `<label>`
- Reason: Wrapping `<input>` and `<select>` children directly inside `<label>` in `Field` helper components (`NodeForm.jsx`, `EdgeForm.jsx`) ensures accessible label association without requiring explicit `id`/`htmlFor` boilerplate across dynamically instantiated form controls.
- Rejected: Manually generating unique `htmlFor` / `id` strings for every form field or leaving labels detached.
- Constraint: Future form components should nest input controls inside `<label>` or ensure explicit `htmlFor` association for accessibility and standard `@testing-library/react` `getByLabelText` compatibility.

## 2026-08-17: Anchor `.gitignore` data rules to root (`/data/`, `/datasets/`)
- Reason: Bare `data/` rule inadvertently ignored `frontend/src/data/mockData.js`, causing mock datasets and their tests to disappear from version control.
- Rejected: Unanchored `data/` wildcard.
- Constraint: Data directories must be anchored as `/data/` and `/datasets/` in root `.gitignore`.

## 2026-08-17: Vitest + jsdom with lightweight browser API fakes
- Reason: Unit and component tests need rapid execution in jsdom without running a real browser or spinning up the live backend/WebSocket servers. `MemoryStorage`, `crypto.randomUUID`, and `FakeWebSocket` stubs in `src/test/setup.js` provide full hook and UI testability while preventing import chain crashes in jsdom.
- Rejected: Heavy browser test harnesses (Cypress/Playwright) for unit logic or skipping mock-mode test coverage.
- Constraint: Frontend test suite lives under `vitest run` with jsdom environment configured in `vite.config.js` and `src/test/setup.js`.

## 2026-08-16: Always deliver complete files, never chat-pasted diffs
- Reason: manual copy-paste from chat repeatedly corrupted files (truncated
  replacements, transcription typos like `ndoes` → `nodes`).
- Rejected: relying on the user to copy/merge diffs by hand.
- Constraint: all future sessions must use file-creation/`str_replace` tools
  for anything the user will save, not chat-message code blocks.

## 2026-08-16: Two-database split — Neo4j for graph, Postgres for relational/auth
- Reason: Neo4j gives native graph traversal/Cypher for the knowledge-graph
  core; Postgres handles relational concerns (users, auth, migrations via
  Alembic) that don't map naturally onto a graph store.
- Rejected: single-store designs (Neo4j-only or Postgres-only with an
  adjacency-list table) — Neo4j-only would make relational/auth queries
  awkward; Postgres-only would make graph traversal and GNN data loading slow.
- Constraint: any feature touching both "who owns this" and "how is this
  connected" (e.g. F020 auth enforcement + per-user graph isolation) has to
  reconcile state across both stores.

## 2026-08-16: PyTorch Geometric (PyG) over DGL for the GNN engine
- Reason: chosen as the GNN framework for embeddings, link prediction, and
  clustering (GCN/GAT/GraphSAGE).
- Rejected: DGL — noted as the alternative in the original project spec but
  not the one implemented.
- Constraint: GNN-related services and their dependencies (torch, torch-geometric)
  are isolated behind `services/`, and their tests are excluded from the
  default fast test suite (see `conventions.md`), so this choice doesn't slow
  down non-ML iteration.

## 2026-08-16: Fresh-clone verification at the start of every session
- Reason: prior sessions' "reported complete" state didn't always match
  actual repo state; trusting the last progress note without re-verifying led
  to wasted work.
- Rejected: trusting `claude-progress.md`/`gemini-progress.md` at face value.
- Constraint: every session starts with `git clone` + running the full
  verification pipeline (`verification.md`) before believing any prior
  "passing" claim.