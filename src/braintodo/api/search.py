from fastapi import APIRouter, Depends 

from braintodo.api.nodes import get_embedder, get_store
from braintodo.embedding.base import EmbeddingProvider
from braintodo.graph.base import GraphStore
from braintodo.models.search import SearchResult
from braintodo.search.service import SearchService

router = APIRouter(prefix="/search", tags=["search"])

def get_search_service(
    store: GraphStore = Depends(get_store),
    embedder: EmbeddingProvider = Depends(get_embedder),
) -> SearchService: 
    return SearchService(store, embedder)

@router.get("", response_model=SearchResult)
async def search(
    q: str, 
    limit: int = 10, 
    depth: int = 1, 
    service: SearchService = Depends(get_search_service),
) -> SearchResult: 
    return await service.search(q, limit, depth)