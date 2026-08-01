from fastapi import APIRouter, Depends

from braintodo.api.nodes import get_store
from braintodo.clustering.service import ClusterService
from braintodo.graph.base import GraphStore
from braintodo.models.cluster import Cluster

router = APIRouter(prefix="/clusters", tags=["clusters"])

def get_cluster_service(store: GraphStore = Depends(get_store)) -> ClusterService: 
    return ClusterService(store)

@router.get("", response_model=list[Cluster])
async def get_clusters(
    service: ClusterService = Depends(get_cluster_service), 
) -> list[Cluster]: 
    return await service.detect_clusters()