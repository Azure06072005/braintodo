import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import analytics, clusters, edges, gnn, links, nodes, realtime, search
from .graph.migrations import run_migrations
from braintodo.db.base import close_engine

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    try:
        store = nodes._default_store()
        await run_migrations(store._driver)
    except Exception:
        logger.warning("Could not run Neo4j migrations at startup", exc_info=True)
    yield
    await nodes.close_default_store()
    await close_engine()

tags_metadata = [
    {
        "name": "nodes",
        "description": "CRUD cho idea node — tiêu đề, nội dung, tag, thuộc tính thị giác (color/shape/size).",
    },
    {
        "name": "edges",
        "description": "CRUD cho quan hệ (edge) giữa hai idea node.",
    },
    {
        "name": "gnn",
        "description": "Tính lại graph_embedding (32-d) cho toàn bộ node qua PyTorch Geometric GCN.",
    },
    {
        "name": "links",
        "description": "Gợi ý liên kết còn thiếu dựa trên cosine similarity của graph_embedding.",
    },
    {
        "name": "clusters",
        "description": "Phát hiện cụm chủ đề (community detection) bằng Louvain.",
    },
    {
        "name": "analytics",
        "description": "Chỉ số topology: degree, degree centrality, betweenness centrality, PageRank.",
    },
    {
        "name": "realtime",
        "description": "WebSocket cập nhật đồ thị theo thời gian thực.",
    },
    {
        "name": "search",
        "description": "Tìm kiếm kết hợp keyword + semantic similarity + mở rộng subgraph BFS.",
    },
]

app = FastAPI(
    title="braintodo",
    description="GNN-Powered Idea Management API",
    version="0.0.1",
    openapi_tags=tags_metadata,
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
app.include_router(gnn.router)
app.include_router(links.router)
app.include_router(clusters.router)
app.include_router(analytics.router)
app.include_router(realtime.router)
app.include_router(search.router)