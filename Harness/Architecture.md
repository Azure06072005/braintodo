# Architecture — braintodo

> Status: reconstructed from project description + prior session summaries.
> Anything marked **[unconfirmed]** should be checked against a fresh clone
> before being trusted (Principle 3 — don't guess).

## What is this system?

`braintodo` is a GNN-powered idea/knowledge management API. Instead of storing
ideas as a flat to-do list or a strict hierarchy, it models them as a
**knowledge graph** — nodes are ideas/tasks/notes, edges are typed semantic or
logical relationships (e.g. "leads to", "resolves", "extends", "contradicts").
A Graph Neural Network layer (GCN/GAT/GraphSAGE via PyTorch Geometric) combines
text embeddings with graph structure to produce node embeddings, which power
link prediction (suggesting connections the user hasn't made yet), community
detection (auto-clustering ideas into "mind regions"), and topological search.
The backend is a FastAPI service; the frontend is a React/Vite app with a D3
graph visualization and realtime updates over WebSocket.

## How is it organized?

**[unconfirmed — inferred from stack + FastAPI/React conventions, verify against repo]**

```
braintodo/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app entrypoint, router registration
│   │   ├── routers/         # nodes, edges, graph, auth, search, export/import
│   │   ├── models/          # SQLAlchemy (Postgres) models; Neo4j node/edge schemas
│   │   ├── schemas/         # Pydantic request/response models
│   │   ├── services/        # GNN pipeline: embedding, link prediction, clustering
│   │   ├── db/               # Neo4j driver, async Postgres session, Alembic env
│   │   └── core/              # config, JWT/security, dependency injection
│   ├── tests/                  # pytest, mirrors app/ structure
│   └── alembic/                 # Postgres migrations
├── frontend/
│   ├── src/
│   │   ├── pages/            # routed views (FE013 routing shell)
│   │   ├── components/       # D3 graph canvas, node/edge forms
│   │   ├── hooks/             # useAuth (FE015), useGraph, useWebSocket
│   │   └── api/                # REST + WebSocket client
│   └── vite.config.ts
├── docs/                        # architecture.md, conventions.md, verification.md, DECISIONS.md
├── feature_list.json
├── claude-progress.md / gemini-progress.md
└── AGENTS.md
```

## How do I run it locally?

**[unconfirmed — confirm exact compose/service names against repo]**

Backend:
```bash
docker-compose up -d neo4j postgres     # start graph DB + relational DB
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

API docs available at `/docs` (Swagger) and `/redoc` once the backend is running.

## Key conventions that aren't obvious from the code itself

- The graph lives in **two stores**: Neo4j for structure/traversal, Postgres
  for relational/auth data. Don't assume a single source of truth for a node —
  check which store a given field belongs to.
- GNN inference (embeddings, link prediction, clustering) is treated as a
  **service layer**, not inline in routers — keep ML logic out of `routers/`.
- See `conventions.md` for naming, layout, error handling, and testing rules,
  and `DECISIONS.md` for why the two-database split and PyG (not DGL) were chosen.