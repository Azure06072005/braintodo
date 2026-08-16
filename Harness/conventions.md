# Conventions — braintodo

Project-specific style and patterns that aren't obvious from reading the code
cold. Only rules with a source (why), applicability (when), and expiry (when
to remove) belong here. Audit regularly — delete anything stale.

## Naming
- Python (backend): `snake_case` for functions/variables, `PascalCase` for
  SQLAlchemy models and Pydantic schemas. Suffix Pydantic response models with
  the noun, not `Response`/`Out` unless already convention in the repo —
  **[unconfirmed, check existing schemas/ before adding new ones]**.
- TypeScript/React (frontend): `camelCase` for variables/functions,
  `PascalCase` for components, `useX` for hooks (`useAuth`, `useGraph`,
  `useWebSocket`).

## File/folder layout rules
- Source: architecture.md.
- ML/GNN logic (embedding, link prediction, clustering) stays in
  `backend/app/services/`, never inline in `routers/`. Reason: keeps route
  handlers thin and testable without a torch/GPU dependency.
- Frontend routed views go in `pages/`; reusable pieces in `components/`.

## Error handling pattern
- Backend: FastAPI `HTTPException` at the router boundary; services raise
  domain-specific exceptions that routers translate to HTTP status codes.
  **[unconfirmed — verify a central exception handler exists before assuming]**.
- Frontend: `useAuth`/`useGraph` hooks expose both a mock and a live mode —
  preserve this dual-mode pattern when adding new hooks (per prior session
  learnings); don't collapse it into a single mode "for simplicity."

## Testing pattern (where tests live, naming, fixtures)
- Backend: `pytest`, tests mirror `app/` structure 1:1 under `backend/tests/`.
- Tests that require torch or a live Neo4j connection are excluded from the
  default fast suite (last reported: 79 passing tests excluding these).
  Reason: keeps CI/local iteration fast; run the full suite (including
  torch/Neo4j-dependent tests) before marking a feature `passing`, per
  Principle 10 (full-pipeline verification).
- Auth-dependent backend tests use FastAPI's dependency-override pattern
  rather than mocking the JWT layer directly — preserve this when extending
  F020 (auth enforcement).

## Copy/delivery convention (source: repeated corruption incidents)
- **Never** paste partial diffs or abbreviated snippets and expect them to be
  hand-copied. Prior sessions saw corrupted files from manual copy-paste
  (truncated replacements, typos like `ndoes` → `nodes`). Always deliver
  complete file contents via file-creation tools (or `str_replace` for
  targeted edits), never as a chat snippet the user has to retype.
- Expiry: remove this rule once file delivery is fully tool-mediated end to
  end (i.e. the user never needs to manually copy code from a chat message).