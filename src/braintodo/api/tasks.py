from datetime import UTC, datetime

from fastapi import APIRouter, Depends

from braintodo.api.auth import get_current_user
from braintodo.api.nodes import get_store
from braintodo.db.models import User
from braintodo.graph.base import GraphStore
from braintodo.models.node import Node

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/today", response_model=list[Node])
async def get_today_tasks(
    store: GraphStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> list[Node]:
    """F026: the caller's task-nodes that are due today or overdue and not
    yet completed, owner-scoped. Uses GraphStore.list_nodes (unpaginated -
    "today" is expected to be a small working set, unlike the general node
    listing that F014 paginates) and filters in Python rather than adding a
    new Cypher query shape, since node_type/due_date/completed_at filtering
    here doesn't need to be index-backed at this scale.
    """
    owner_id = str(current_user.id)
    all_nodes = await store.list_nodes(owner_id)
    today = datetime.now(UTC).date()
    return [
        n
        for n in all_nodes
        if n.node_type == "task"
        and n.completed_at is None
        and n.due_date is not None
        and n.due_date <= today
    ]