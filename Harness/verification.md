# Verification Commands — braintodo

Only full-pipeline verification counts (Principle 10).

**Status: verified against the actual repo on 2026-08-25** (every command
below was run for real, or - where noted - reviewed against the real repo
structure and confirmed correct without being executable in this
environment). This file previously carried an unverified "best-effort,
confirm before trusting" caveat since the project's first session; that
verification pass is what produced the corrections below. See Decisions.md
for the specific errors found and fixed.

| Check                | Command (backend)                                                          | Command (frontend)          |
|-----------------------|------------------------------------------------------------------------------|-------------------------------|
| Install               | `pip install -r requirements.txt -r requirements-dev.txt && pip install -e .` | `npm install`                |
| Tests (fast/default)  | `pytest -q --ignore=tests/test_gnn.py --ignore=tests/test_gnn_service.py --ignore=tests/test_clustering.py --ignore=tests/test_link_prediction.py --ignore=tests/test_neo4j_store.py` | `npm run test`              |
| Tests (full)          | `pytest -q` *(requires torch/torch-geometric/leidenalg installed + live Neo4j reachable)* | `npm run test`              |
| Lint                  | `ruff check .`                                                             | `npm run lint`               |
| Type-check            | `mypy src tests`                                                           | *(none - plain JS/JSX, no TypeScript in this project; `npm run lint` via oxlint is the frontend's only static check)* |
| Build                 | `docker build -t braintodo-backend .` *(root `Dockerfile`, added 2026-08-25 - see Decisions.md; not yet verified by an actual `docker build` run, no docker daemon in any session's sandbox so far)* | `npm run build`           |
| Full stack (compose)  | `docker compose up --build` *(builds `app` + `frontend` + starts `neo4j`/`postgres`; not yet verified end-to-end - see Decisions.md)* | — |
| Smoke run             | `uvicorn braintodo.main:app --reload` then `curl localhost:8000/docs`      | `npm run dev` then load `localhost:5173` |

Notes:
- "Tests (fast/default)" excludes the 5 torch/Neo4j-dependent test files
  (`test_gnn.py`, `test_gnn_service.py`, `test_clustering.py`,
  `test_link_prediction.py`, `test_neo4j_store.py`) for quick iteration.
  Actually run and confirmed on 2026-08-25: **105 passed**. This is **not**
  sufficient to mark a feature `passing` — the full suite must pass, per
  the full-pipeline rule. (Last genuinely full run: 129 passed, 1 skipped -
  `test_neo4j_store.py` self-skips without a reachable Neo4j; see
  feature_list.json's F021 entry.)
- The smoke-run command was actually executed on 2026-08-25 (not just
  reviewed): `uvicorn braintodo.main:app` starts successfully and
  `GET /docs` returns `200` even with **no Neo4j reachable at all** - the
  app logs "Could not run Neo4j migrations at startup" and continues
  rather than crashing on boot. This is a real, previously-unconfirmed
  resilience property, not an assumption.
- The frontend has no separate type-check step - it's plain JavaScript/JSX
  (confirmed: no `tsconfig.json`, no `typescript` package, no `.ts`/`.tsx`
  files anywhere in `frontend/src`). `npm run lint` (oxlint) is the only
  static check.
- `docker compose up -d neo4j postgres` starts just the databases (for
  running the full backend test suite locally against a real Neo4j without
  containerizing the app itself). `docker compose up --build` builds and
  runs everything, including the `app` and `frontend` services.
- Neither the standalone backend `docker build` nor the full `docker
  compose up --build` has been verified end-to-end by any session yet - no
  session so far has had a docker daemon available. The commands above are
  believed correct based on static review against the real repo structure
  (confirmed: `Dockerfile` copies real files that exist, `braintodo.main:app`
  is a real importable entrypoint, `docker-compose.yml`'s frontend build
  context now points at the real `frontend/` directory after a 2026-08-25
  fix - see Decisions.md), not by an actual successful build.
- A feature only moves to `passing` in `feature_list.json` when its own
  verification command succeeds **and** every row above is clean.