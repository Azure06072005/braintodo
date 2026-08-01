from fastapi import APIRouter, Depends

from braintodo.analytics.service import TopologyService
from braintodo.api.nodes import get_store
from braintodo.graph.base import GraphStore
from braintodo.models.topology import NodeTopology

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_topology_service(store: GraphStore = Depends(get_store)) -> TopologyService: 
    return TopologyService(store)

@router.get("/topology", response_model=list[NodeTopology])
async def get_topology( 
    service: TopologyService = Depends(get_topology_service),
) -> list[NodeTopology]: 
    return await service.compute_metrics()