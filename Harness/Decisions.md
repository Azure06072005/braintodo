# Design Decisions — braintodo

Log of deliberate, non-obvious choices so a future session doesn't reverse
one without a new reason. Newest at the top. Dates below are the date this
log entry was written (reconstructed from prior session summaries); the
underlying decisions were made in earlier sessions whose exact dates weren't
recorded — fix the dates if you have the real commit history.

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