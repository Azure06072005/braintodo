from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from braintodo.api import edges, nodes


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: nothing to eagerly connect - the Neo4j driver is created lazily
    # on first use (see api/nodes.py::_default_store), so a missing/unreachable
    # database doesn't prevent the app from booting.
    yield
    # Shutdown: close the Neo4j driver if one was ever created, so the
    # connection pool doesn't leak past process lifetime.
    nodes.close_default_store()


app = FastAPI(
    title="braintodo",
    description="GNN-Powered Idea Management API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(nodes.router)
app.include_router(edges.router)
