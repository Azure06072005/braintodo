from fastapi import APIRouter, Depends

from braintodo.api.nodes import get_store
from braintodo.gnn.base import GraphEmbedder
from braintodo.gnn.pyg_graph_embedder import get_pyg_gcn_embedder
from braintodo.gnn.service import GraphEmbeddingService
from braintodo.graph.base import GraphStore

router = APIRouter(prefix="/gnn", tags=["gnn"])

# Must match the output dimension of the configured text-embedding provider
# (SentenceTransformerProvider's default model, all-MiniLM-L6-v2, is 384-d).
# NOTE: if the text-embedding model is ever changed, this needs to change too.
_TEXT_EMBEDDING_DIMENSION = 384

def get_graph_embedder() -> GraphEmbedder: 
     """Real production GNN. Tests override this with FakeGraphEmbedder via
    app.dependency_overrides[get_graph_embedder]."""
    return get_pyg_gcn_embedder(input_dimension=_TEXT_EMBEDDING_DIMENSION)

def get_embedding_service(
    store: GraphStore = Depends(get_store), 
    embedder: GraphEmbedder = Depends(get_graph_embedder),
) -> GraphEmbeddingService: 
    return GraphEmbeddingService(store, embedder)

@router.post("/recompute")
async def recompute_graph_embeddings(
    service: GraphEmbeddingService = Depends(get_embedding_service),
) -> dict[str, int]: 
    updated = await service.recompute_all()
    return {"updated": updated}