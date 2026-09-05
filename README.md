# braintodo

A GNN-powered idea/knowledge-management application. Ideas live as nodes in a
graph (not a flat list or strict hierarchy), connected by typed relationships
(`leads_to`, `resolves`, `extends`, `contradicts`, ...). A Graph Neural
Network layer combines text embeddings with graph structure to power link
prediction, community detection ("mind regions"), and topological search. A
lightweight task layer sits on top of the same nodes, so idea management and
day-to-day task tracking share one graph instead of being two separate apps.

> **This README was written from a fresh clone and an actual run of the
> verification pipeline** (install, test, lint, type-check, build), not from
> the repo's own progress logs taken at face value — see
> [Verification status](#verification-status--important) for what that
> turned up, including one currently broken backend build.

---

## Contents
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Feature inventory](#feature-inventory)
- [Verification status (important)](#verification-status--important)
- [Getting started](#getting-started)
- [Project conventions & history](#project-conventions--history)

---

## Tech stack

**Backend** — Python 3.12, FastAPI, Neo4j (graph store) + PostgreSQL (relational/auth,
via SQLAlchemy async + Alembic migrations), PyTorch / PyTorch Geometric (GNN),
sentence-transformers (text embeddings), python-igraph + leidenalg (Leiden
community detection), JWT auth (python-jose + passlib/bcrypt), WebSockets for
realtime graph events.

**Frontend** — React + Vite, D3 (2D force-directed graph canvas) and
Three.js/`react-three-fiber`-style 3D canvas (`GraphCanvas3D`) with a 2D/3D
toggle, react-router-dom, i18n (vi/en/ja) via a custom translation layer,
Vitest + jsdom + Testing Library, oxlint.

**Infra** — Docker + `docker-compose.yml` (app, frontend, Neo4j, Postgres),
Vercel config for frontend deployment.

## Architecture

```
braintodo/
├── src/braintodo/
│   ├── main.py           # FastAPI entrypoint, router registration
│   ├── api/               # nodes, edges, graph, auth, search, clusters,
│   │                      # links, analytics, gnn, realtime, tasks
│   ├── models/             # Pydantic request/response models
│   ├── db/                  # Postgres (SQLAlchemy async) models/session, User
│   ├── graph/                 # GraphStore protocol + Neo4j/in-memory repositories
│   ├── embedding/              # text embedding provider (+ offline fallback)
│   ├── gnn/                     # GCN/GAT/GraphSAGE embedding service
│   ├── clustering/               # Leiden-based community detection
│   ├── linking/                   # link prediction / suggested connections
│   ├── search/                     # semantic + topological search
│   ├── analytics/                   # degree/betweenness/PageRank
│   └── realtime/                     # WebSocket ConnectionManager
├── tests/                              # pytest, mirrors src/ structure
├── alembic/                              # Postgres migrations
├── frontend/
│   └── src/
│       ├── pages/        # LandingPage, RegisterPage, LoginPage, VerifyEmailPage, AppPage
│       ├── components/    # GraphCanvas (2D/D3), GraphCanvas3D (three.js), NodeForm,
│       │                  # EdgeForm, SearchBar, NodeDetailPanel, TopBar, Starfield,
│       │                  # ImportExportControls, PersonalizationPanel, Modal
│       ├── hooks/           # useAuth, useGraphData (mock + live modes)
│       ├── i18n/, locales/    # vi/en/ja translations
│       ├── personalization/    # theme customizer, palette presets, storage
│       ├── clustering/          # mock-mode client-side clustering
│       ├── search/                # mock-mode client-side search
│       └── graph3d/                # 3D view helpers
├── Harness/                              # architecture/decisions/progress docs,
│                                          # feature lists, verification commands
└── docker-compose.yml / Dockerfile / vercel.json
```

Two data stores, split deliberately: **Neo4j** for the graph itself (nodes,
edges, traversal), **Postgres** for relational/auth concerns (users, tokens).
Any feature that touches both ownership and connectivity — most notably
per-user graph isolation — has to reconcile state across both stores.
GNN/ML logic is kept out of the FastAPI routers and lives in `services`-style
modules (`gnn/`, `clustering/`, `linking/`) so routers stay testable without a
torch/GPU dependency.

## Feature inventory

Tracked in `Harness/be_feature_list.json` (28 backend features) and
`Harness/fe_feature_list.json` (27 frontend features). Per the repo's own
harness rules, `passing` is supposed to mean "independently re-verified,"
but see the [verification status](#verification-status--important) section
below — that claim did not hold up on this pass for the backend.

### Backend (F001–F028)

| Group | Features |
|---|---|
| Core graph CRUD | **F001** Node CRUD · **F002** Edge CRUD with typed relations · **F014** Node/Edge pagination |
| ML / GNN pipeline | **F003** Text embedding pipeline · **F004** Graph-aware node embeddings (GCN/GAT/GraphSAGE) · **F005**/**F016** Link prediction + API · **F006**/**F015** Community detection (Leiden) + API · **F018** GNN recompute API · **F021** Configurable embedding provider with offline fallback · **F022** Leiden clustering upgrade with configurable resolution + semantic labels |
| Search & analytics | **F007**/**F017** Graph topology analytics (degree/betweenness/PageRank) + API · **F008** Semantic + topological search |
| Auth | **F009** Registration · **F010** Email verification · **F011** Login (JWT) · **F012** `/auth/me` · **F020** Auth enforcement + per-user graph isolation (`owner_id`) |
| Realtime | **F013** WebSocket broadcast (`/ws?token=`), scoped per owner |
| Import/export | **F019** Graph export/import with WebSocket broadcast on change |
| 3D layout | **F023** Persisted 3D node position (x, y, z) — **not started** |
| Task layer | **F024** Task fields on Node · **F025** Task completion/reopen + filtered listing · **F026** Daily task query (`/tasks/today`) · **F027** Daily/period task summary (`/tasks/summary`) · **F028** Task recurrence engine |

### Frontend (FE001–FE027)

| Group | Features |
|---|---|
| Auth flow | **FE001** Landing page · **FE002** RegisterPage · **FE003** VerifyEmailPage · **FE004** LoginPage · **FE005** `useAuth` hook |
| Core app | **FE006** `useGraphData` hook (mock + live, WebSocket updates) · **FE007** AppPage orchestration · **FE013** Routing shell · **FE017** stabilized hook references (fixed a React #185 infinite topology-recompute loop) · **FE018** mock-mode cluster recompute on structural changes |
| Graph UI | **FE008** GraphCanvas (2D/D3) · **FE025** GraphCanvas3D + 2D/3D toggle · **FE009** NodeForm · **FE010** EdgeForm · **FE011** NodeDetailPanel · **FE012** SearchBar · **FE014** ImportExportControls · **FE016** Export/import UI |
| Visual design / theming | **FE022** "Universe" visual theme (starfield background, orbit motifs, space color tokens) · **FE023** Node/edge/background personalization (theme customizer, palette presets) |
| i18n | **FE019** i18n foundation (vi/en/ja) + TopBar · **FE020** SearchBar i18n · **FE021** NodeForm i18n · **FE027** EdgeForm i18n |
| Marketing / production gating | **FE024** Marketing pages redesign (About / How it works / Example) · **FE026** Gate authenticated app to live data only in production; mock data lives exclusively on marketing pages |

---

## Verification status — important

The repo's own `AGENTS.md` rule is: *"Never mark a feature passing without
actually re-running its verification command."* This pass did exactly that,
from a fresh clone (`git clone https://github.com/Azure06072005/braintodo`,
head commit `8376abc`, merge of PR #49 "task-layer-f024-f028").

### 🔴 Backend: currently cannot start — the entire pytest suite fails at collection

```
ImportError while loading conftest '/home/claude/braintodo/tests/conftest.py'.
tests/conftest.py:11: in <module>
    from braintodo.main import app
src/braintodo/main.py:10: in <module>
    from .api import analytics, auth, clusters, edges, gnn, graph, links, nodes, realtime, search, tasks
src/braintodo/api/tasks.py:10: in <module>
    from braintodo.models.task import TaskSummary
E   ModuleNotFoundError: No module named 'braintodo.models.task'
```

`src/braintodo/api/tasks.py` imports `TaskSummary` from
`braintodo.models.task`, but **that module does not exist anywhere in the
repository or its git history** — confirmed with
`git log --all --diff-filter=A -- '*task.py'` (no results) and a direct
`import braintodo.models.task` (fails). `claude-progress.md`'s 2026-09-01
entry for F027 explicitly describes creating `src/braintodo/models/task.py`
and reports 162 tests passing, but that file was never actually committed —
it appears to have been lost between local work and the PR #49 merge
(`dcdd569`), whose diff touches `models/node.py` but never adds
`models/task.py`.

**Net effect: 0 backend tests currently run.** `pytest` fails before
collecting a single test, for every one of F001–F028, not just the task-layer
features (F024–F028) that introduced the bad import. `ruff check .` and
`mypy src tests` both still report clean — **but only because
`pyproject.toml` sets `ignore_missing_imports = true` for mypy**, which
silently swallows exactly this class of error. Neither static check would
have caught this; only actually invoking the app or the test suite does.

**Fix required:** re-create `src/braintodo/models/task.py` with a
`TaskSummary` Pydantic model matching what `api/tasks.py`'s
`get_task_summary` endpoint returns (`created`, `completed`, `overdue` node
lists/counts and `avg_completion_seconds`, per the docstring in
`api/tasks.py`), then re-run the full verification pipeline before trusting
any F024–F028 "passing" status again.

Everything below this point (fast-suite counts, "129 passed," etc.) reflects
prior sessions' self-reported numbers in `Harness/claude-progress.md` /
`Harness/gemini-progress.md` and **could not be independently re-confirmed**
this session because the app doesn't import. Treat F001–F028's `passing`
labels in `Harness/be_feature_list.json` as unverified until this is fixed.

### 🟢 Frontend: verified clean

Actually run this session, fresh install (`npm install`), no code changes:

| Check | Command | Result |
|---|---|---|
| Test | `npm run test -- --run` | **27 files / 156 tests passed** |
| Build | `npm run build` | ✅ 631 modules transformed, ~1.2s |
| Lint | `npm run lint` (oxlint) | ✅ 0 warnings, 0 errors, 66 files |

One build note carried over from Vite's own output: the 3D graph chunk
(`GraphCanvas3D`, ~544 kB / 136 kB gzipped) and the main bundle
(~353 kB / 113 kB gzipped) both exceed Vite's 500 kB chunk-size warning
threshold — not a failure, but a candidate for future code-splitting
(dynamic `import()` for the 3D view, which most users may not open).

### Not attempted this session
- Full backend suite including torch/Neo4j-dependent tests
  (`test_gnn.py`, `test_gnn_service.py`, `test_clustering.py`,
  `test_link_prediction.py`, `test_neo4j_store.py`) — moot until the import
  bug above is fixed, and would additionally require a reachable Neo4j
  instance and a `torch`/`torch-geometric`/`sentence-transformers` install.
- `docker build` / `docker compose up --build` — no Docker daemon available
  in this environment, consistent with every prior session's notes in
  `Harness/verification.md`.

---

## Getting started

**Backend** (currently blocked — see above; steps below are otherwise as
documented in `Harness/AGENTS.md` / `Harness/verification.md`):
```bash
docker compose up -d neo4j postgres
pip install -r requirements.txt -r requirements-dev.txt
pip install -e .
alembic upgrade head
uvicorn braintodo.main:app --reload   # currently fails: see Verification status
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run test      # Vitest
npm run build      # production bundle
npm run lint        # oxlint
```

API docs (once the backend import bug is fixed) are served at `/docs`
(Swagger) and `/redoc`.

---

## Project conventions & history

Full detail lives in `Harness/`:
- `Architecture.md` — system design and directory layout
- `conventions.md` — naming, layout, testing, and delivery conventions
  (notably: always deliver complete files via tools, never chat-pasted
  diffs/snippets, after repeated copy-paste corruption incidents)
- `Decisions.md` — dated log of non-obvious design decisions and incidents
  (two-database split, PyG over DGL, Leiden over Louvain, a prior
  `feature_list.json` id-corruption incident, a WebSocket
  datetime-serialization bug found and fixed alongside F027)
- `verification.md` — the canonical verification commands for this repo
- `claude-progress.md` / `gemini-progress.md` — per-agent session logs
- `be_feature_list.json` / `fe_feature_list.json` — the feature state
  machine (`not_started` → `active` → `passing`, irreversible once
  genuinely verified)

The project's own hard-won principle, reaffirmed by this session's findings:
**a prior session's self-reported "passing" or "N tests passed" is not
evidence.** Fresh-clone, full-pipeline re-verification is the only thing
that counts — which is exactly how the backend import bug above was found.
