import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from braintodo.api import edges, nodes
from braintodo.graph.migrations import run_migrations

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Best-effort - a missing/unreachable database at boot time shouldn't
    # prevent the app from starting; requests will just fail until it's back.
    try:
        store = nodes._default_store()
        await run_migrations(store._driver)
    except Exception:
        logger.warning("Could not run Neo4j migrations at startup", exc_info=True)
    yield
    await nodes.close_default_store()


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
