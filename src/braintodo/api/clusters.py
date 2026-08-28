from fastapi import APIRouter, Depends, Query

from braintodo.api.auth import get_current_user
from braintodo.api.nodes import get_store
from braintodo.clustering.service import ClusterService
from braintodo.db.models import User
from braintodo.graph.base import GraphStore
from braintodo.models.cluster import Cluster

router = APIRouter(prefix="/clusters", tags=["clusters"])


def get_cluster_service(store: GraphStore = Depends(get_store)) -> ClusterService:
    return ClusterService(store)


@router.get("", response_model=list[Cluster])
async def get_clusters(
    resolution: float = Query(
        default=1.0,
        gt=0,
        description=(
            "Leiden resolution parameter. Higher values produce more, "
            "smaller clusters; lower values produce fewer, larger ones. "
            "Defaults to 1.0."
        ),
    ),
    service: ClusterService = Depends(get_cluster_service),
    current_user: User = Depends(get_current_user),
) -> list[Cluster]:
    return await service.detect_clusters(str(current_user.id), resolution=resolution)