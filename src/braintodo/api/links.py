from fastapi import APIRouter, Depends

from braintodo.api.auth import get_current_user
from braintodo.api.nodes import get_store
from braintodo.db.models import User
from braintodo.graph.base import GraphStore
from braintodo.linking.service import LinkPredictionService
from braintodo.models.link_suggestion import LinkSuggestion

router = APIRouter(prefix="/links", tags=["links"])


def get_link_prediction_service(
    store: GraphStore = Depends(get_store),
) -> LinkPredictionService:
    return LinkPredictionService(store)


@router.get("/suggestions", response_model=list[LinkSuggestion])
async def get_link_suggestion(
    limit: int = 10,
    service: LinkPredictionService = Depends(get_link_prediction_service),
    current_user: User = Depends(get_current_user),
) -> list[LinkSuggestion]:
    return await service.suggest_links(str(current_user.id), limit)