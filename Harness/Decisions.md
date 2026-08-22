# Design Decisions — braintodo

Log of deliberate, non-obvious choices so a future session doesn't reverse
one without a new reason. Newest at the top. Dates below are the date this
log entry was written (reconstructed from prior session summaries); the
underlying decisions were made in earlier sessions whose exact dates weren't
recorded — fix the dates if you have the real commit history.

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