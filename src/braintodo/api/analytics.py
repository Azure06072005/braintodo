from fastapi import APIRouter, Depends

from braintodo.analytics.service import TopologyService
from braintodo.api.auth import get_current_user
from braintodo.api.nodes import get_store
from braintodo.db.models import User
from braintodo.graph.base import GraphStore
from braintodo.models.topology import NodeTopology

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_topology_service(store: GraphStore = Depends(get_store)) -> TopologyService:
    return TopologyService(store)


@router.get("/topology", response_model=list[NodeTopology])
async def get_topology(
    service: TopologyService = Depends(get_topology_service),
    current_user: User = Depends(get_current_user),
) -> list[NodeTopology]:
    return await service.compute_metrics(str(current_user.id))