from datetime import UTC, date, datetime

from fastapi import APIRouter, Depends, Query

from braintodo.api.auth import get_current_user
from braintodo.api.nodes import get_store
from braintodo.db.models import User
from braintodo.graph.base import GraphStore
from braintodo.models.node import Node
from braintodo.models.task import TaskSummary

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


@router.get("/summary", response_model=TaskSummary)
async def get_task_summary(
    date: date = Query(...),
    store: GraphStore = Depends(get_store),
    current_user: User = Depends(get_current_user),
) -> TaskSummary:
    """F027: aggregate task-node activity for a single calendar date,
    owner-scoped. Definitions (see Decisions.md for why these were chosen):
      - created: task-nodes whose created_at falls on `date`.
      - completed: task-nodes whose completed_at falls on `date`.
      - overdue: task-nodes still uncompleted whose due_date is strictly
        before `date` - a live "as currently uncompleted" count, not a
        historical reconstruction of what was overdue on that day.
      - avg_completion_seconds: mean (completed_at - created_at) over the
        `completed` set above; null if nothing completed that day.
    """
    owner_id = str(current_user.id)
    all_nodes = await store.list_nodes(owner_id)
    tasks = [n for n in all_nodes if n.node_type == "task"]

    created = [n for n in tasks if n.created_at.astimezone(UTC).date() == date]
    completed = [
        n
        for n in tasks
        if n.completed_at is not None and n.completed_at.astimezone(UTC).date() == date
    ]
    overdue = [
        n
        for n in tasks
        if n.completed_at is None and n.due_date is not None and n.due_date < date
    ]

    avg_completion_seconds: float | None = None
    if completed:
        deltas = []
        for n in completed:
            assert n.completed_at is not None  # already filtered above
            deltas.append((n.completed_at - n.created_at).total_seconds())
        avg_completion_seconds = sum(deltas) / len(deltas)

    return TaskSummary(
        date=date.isoformat(),
        completed=len(completed),
        created=len(created),
        overdue=len(overdue),
        avg_completion_seconds=avg_completion_seconds,
    )