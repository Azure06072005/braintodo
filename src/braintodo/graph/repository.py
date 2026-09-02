import asyncio
import calendar
from datetime import date
from typing import Generic, TypeVar

from pydantic import BaseModel

from braintodo.embedding.base import EmbeddingProvider
from braintodo.graph.base import GraphStore
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate, RecurrenceRule

T = TypeVar("T", bound=BaseModel)
CreateT = TypeVar("CreateT", bound=BaseModel)
UpdateT = TypeVar("UpdateT", bound=BaseModel)


class Page(BaseModel, Generic[T]):  # noqa: UP046
    items: list[T]
    total: int
    skip: int
    limit: int


def _advance_due_date(due_date: date, rule: RecurrenceRule) -> date:
    """F028: the next occurrence's due_date, advanced from the just-completed
    occurrence's due_date (not from "today") - a task due every Monday stays
    anchored to Mondays even if completed late."""
    if rule == "daily":
        return date.fromordinal(due_date.toordinal() + 1)
    if rule == "weekly":
        return date.fromordinal(due_date.toordinal() + 7)
    # monthly: same day-of-month next month, clamped to that month's last
    # day (e.g. Jan 31 -> Feb 28/29) rather than overflowing into March.
    month = due_date.month + 1
    year = due_date.year + (month - 1) // 12
    month = (month - 1) % 12 + 1
    day = min(due_date.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


class BaseRepository(Generic[T, CreateT, UpdateT]):  # noqa: UP046
    def __init__(self, store: GraphStore) -> None:
        self._store = store

    async def create(self, data: CreateT, owner_id: str) -> T:
        raise NotImplementedError

    async def get(self, id: str, owner_id: str) -> T:
        raise NotImplementedError

    async def update(self, id: str, data: UpdateT, owner_id: str) -> T:
        raise NotImplementedError

    async def delete(self, id: str, owner_id: str) -> None:
        raise NotImplementedError

    async def list_paginated(self, owner_id: str, skip: int = 0, limit: int = 20) -> Page[T]:
        raise NotImplementedError


class NodeRepository(BaseRepository[Node, NodeCreate, NodeUpdate]):
    def __init__(self, store: GraphStore, embedder: EmbeddingProvider) -> None:
        super().__init__(store)
        self._embedder = embedder

    async def _compute_embedding(self, title: str, content: str) -> list[float]:
        return await asyncio.to_thread(self._embedder.embed, f"{title} {content}")

    async def create(self, data: NodeCreate, owner_id: str) -> Node:
        node = await self._store.create_node(data, owner_id)
        embedding = await self._compute_embedding(node.title, node.content)
        return await self._store.update_node(
            node.id, NodeUpdate(embedding=embedding), owner_id
        )

    async def get(self, id: str, owner_id: str) -> Node:
        return await self._store.get_node(id, owner_id)

    async def update(self, id: str, data: NodeUpdate, owner_id: str) -> Node:
        node = await self._store.update_node(id, data, owner_id)
        if data.title is not None or data.content is not None:
            embedding = await self._compute_embedding(node.title, node.content)
            node = await self._store.update_node(
                id, NodeUpdate(embedding=embedding), owner_id
            )
        return node

    async def delete(self, id: str, owner_id: str) -> None:
        await self._store.delete_node(id, owner_id)

    async def list_paginated(
        self, owner_id: str, skip: int = 0, limit: int = 20, node_type: str | None = None
    ) -> Page[Node]:
        items, total = await self._store.list_nodes_paginated(skip, limit, owner_id, node_type)
        return Page(items=items, total=total, skip=skip, limit=limit)

    async def complete(self, id: str, owner_id: str) -> Node:
        node = await self._store.complete_node(id, owner_id)
        # F028: only recur if there's a due_date to advance from - a
        # recurrence_rule on a task with no due_date has nothing to compute
        # the next occurrence relative to, so it's left as a one-off rather
        # than guessed (e.g. recurring from "today").
        if node.recurrence_rule is not None and node.due_date is not None:
            next_due = _advance_due_date(node.due_date, node.recurrence_rule)
            await self.create(
                NodeCreate(
                    title=node.title,
                    content=node.content,
                    tags=node.tags,
                    weight=node.weight,
                    color=node.color,
                    shape=node.shape,
                    size=node.size,
                    node_type=node.node_type,
                    due_date=next_due,
                    priority=node.priority,
                    recurrence_rule=node.recurrence_rule,
                ),
                owner_id,
            )
        return node

    async def reopen(self, id: str, owner_id: str) -> Node:
        return await self._store.reopen_node(id, owner_id)


class EdgeRepository(BaseRepository[Edge, EdgeCreate, EdgeUpdate]):
    async def create(self, data: EdgeCreate, owner_id: str) -> Edge:
        return await self._store.create_edge(data, owner_id)

    async def get(self, id: str, owner_id: str) -> Edge:
        return await self._store.get_edge(id, owner_id)

    async def update(self, id: str, data: EdgeUpdate, owner_id: str) -> Edge:
        return await self._store.update_edge(id, data, owner_id)

    async def delete(self, id: str, owner_id: str) -> None:
        await self._store.delete_edge(id, owner_id)

    async def list_paginated(self, owner_id: str, skip: int = 0, limit: int = 20) -> Page[Edge]:
        items, total = await self._store.list_edges_paginated(skip, limit, owner_id)
        return Page(items=items, total=total, skip=skip, limit=limit)