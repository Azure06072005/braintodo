# Design Decisions — braintodo

Log of deliberate, non-obvious choices so a future session doesn't reverse
one without a new reason. Newest at the top. Dates below are the date this
log entry was written (reconstructed from prior session summaries); the
underlying decisions were made in earlier sessions whose exact dates weren't
recorded — fix the dates if you have the real commit history.

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

<!--
## YYYY-MM-DD: Short title of the decision
- Reason: why this option was chosen
- Rejected: the alternative(s) considered, and why not
- Constraint: anything this decision locks in going forward
-->