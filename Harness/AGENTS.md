# Agent Instructions — braintodo

`braintodo` is a GNN-powered idea/knowledge-graph management API. Production
backend is **Neo4j** (real DB, via `Neo4jGraphStore`); `InMemoryGraphStore`
(NetworkX) exists only as a fast test double for unit tests. The API is
designed to feed a highly customizable, visual-first frontend later (nodes
carry `color`/`shape`/`size`; CORS is open for now). See `feature_list.json`
for scope and `claude-progress.md` / `gemini-progress.md` for session history.

## Before Starting Any Work
1. Run `./init.sh` to verify environment health (deps install, tests pass, lint/type-check pass).
   Unit tests use the in-memory store and don't need Neo4j running.
2. If working on anything DB-integration-related, run `docker compose up -d neo4j`
   first, then `pytest tests/test_neo4j_store.py` to exercise the real backend.
3. Read `claude-progress.md` for context from the last session.
4. Read `feature_list.json` to see what's done, in-progress, or not-started.
5. Check `git log --oneline -10` for recent changes.

## Rules
- Work on exactly ONE feature (one `feature_list.json` id) at a time.
- Never declare a feature "done" without passing tests for it.
- Run the full test suite (`./init.sh` or `pytest`) before committing.
- Update `claude-progress.md` after every session (what changed, what's next, blockers).
- Update `feature_list.json` status the moment a feature's state changes.
- Commit only when the project is in a clean, resumable state (tests green).
- Follow the Simplicity First / Surgical Changes principles: minimum code for
  the current feature, no speculative abstractions, don't touch unrelated code.
- Do not start GNN/ML features (Phase 2+) before Phase 1 CRUD features are
  "done" and tested, unless explicitly instructed otherwise.
- `Neo4jGraphStore` is the real backend and must stay the one used by the
  running app (`get_store` in `src/braintodo/api/nodes.py`). Never quietly
  swap the app's default dependency to the in-memory store — that store is
  for unit tests only.
- Any new node/edge field meant for frontend visualization (color, shape,
  size, and similar) goes on the Pydantic model and gets round-tripped
  through Neo4j properties — don't invent a separate "style API".

## Roles in this repo
- **Claude**: does research, design decisions, and writes/updates instructions
  for Gemini in `claude-progress.md`. Claude may also implement directly.
- **Gemini**: executes implementation work following Claude's instructions
  and the rules in this file, then logs results in `gemini-progress.md`.

## Verification Checklist (must pass before marking a feature "done")
- [ ] All tests pass (`pytest`)
- [ ] Linter passes (`ruff check .`)
- [ ] Type-check passes (`mypy src`)
- [ ] Feature works as specified in `feature_list.json`
- [ ] `feature_list.json` and `claude-progress.md`/`gemini-progress.md` updated