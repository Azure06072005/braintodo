# Verification Commands — braintodo

Only full-pipeline verification counts (Principle 10). Commands below are
best-effort from the stated stack (FastAPI/Python backend, React/Vite
frontend) — **confirm each one against the actual repo** (package.json
scripts, pyproject.toml/requirements.txt) before trusting them blindly; mark
this file as verified once you've done that.

| Check              | Command (backend)                                      | Command (frontend)          |
|---------------------|----------------------------------------------------------|-------------------------------|
| Install             | `pip install -r requirements.txt`                       | `npm install`                |
| Tests (fast/default)| `pytest -x --ignore=tests/gnn --ignore=tests/graph_db`  | `npm test`                   |
| Tests (full)        | `pytest -x` *(includes torch + live-Neo4j tests)*       | `npm test -- --run`          |
| Lint                | `ruff check .`                                           | `npm run lint`               |
| Type-check          | `mypy app/`                                              | `npx tsc --noEmit`           |
| Build               | `docker build -t braintodo-backend .` *(if containerized)* | `npm run build`           |
| Smoke run           | `uvicorn app.main:app --reload` then `curl localhost:8000/docs` | `npm run dev` then load `localhost:5173` |

Notes:
- "Tests (fast/default)" excludes torch/Neo4j-dependent tests for quick
  iteration (last reported: 79 passing). This is **not** sufficient to mark a
  feature `passing` — the full suite (including torch/Neo4j tests) must pass,
  per the full-pipeline rule.
- Neo4j + Postgres must be running (`docker-compose up -d neo4j postgres`)
  before the full test suite or smoke run will succeed.
- A feature only moves to `passing` in `feature_list.json` when its own
  verification command succeeds **and** every row above is clean.