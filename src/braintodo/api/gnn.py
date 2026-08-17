from fastapi import APIRouter, Depends

from braintodo.api.auth import get_current_user
from braintodo.api.nodes import get_store
from braintodo.db.models import User
from braintodo.gnn.base import GraphEmbedder
from braintodo.gnn.pyg_graph_embedder import get_pyg_gcn_embedder
from braintodo.gnn.service import GraphEmbeddingService
from braintodo.graph.base import GraphStore

router = APIRouter(prefix="/gnn", tags=["gnn"])

_TEXT_EMBEDDING_DIMENSION = 384


def get_graph_embedder() -> GraphEmbedder:
    return get_pyg_gcn_embedder(input_dimension=_TEXT_EMBEDDING_DIMENSION)


def get_embedding_service(
    store: GraphStore = Depends(get_store),
    embedder: GraphEmbedder = Depends(get_graph_embedder),
) -> GraphEmbeddingService:
    return GraphEmbeddingService(store, embedder)


@router.post("/recompute")
async def recompute_graph_embeddings(
    service: GraphEmbeddingService = Depends(get_embedding_service),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    updated = await service.recompute_all(str(current_user.id))
    return {"updated": updated}