from typing import Generic, TypeVar

from pydantic import BaseModel

from braintodo.graph.base import GraphStore
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate

T = TypeVar("T", bound=BaseModel)
CreateT = TypeVar("CreateT", bound=BaseModel)
UpdateT = TypeVar("UpdateT", bound=BaseModel)


class Page(BaseModel, Generic[T]):
    """A single page of results, plus enough info for the caller to page further."""

    items: list[T]
    total: int
    skip: int
    limit: int


class BaseRepository(Generic[T, CreateT, UpdateT]):
    """Generic async repository providing CRUD + pagination for one resource
    type, delegating actual storage to a GraphStore backend (Neo4j or the
    in-memory test double)."""

    def __init__(self, store: GraphStore) -> None:
        self._store = store

    async def create(self, data: CreateT) -> T:
        raise NotImplementedError

    async def get(self, id: str) -> T:
        raise NotImplementedError

    async def update(self, id: str, data: UpdateT) -> T:
        raise NotImplementedError

    async def delete(self, id: str) -> None:
        raise NotImplementedError

    async def list_paginated(self, skip: int = 0, limit: int = 20) -> Page[T]:
        raise NotImplementedError


class NodeRepository(BaseRepository[Node, NodeCreate, NodeUpdate]):
    async def create(self, data: NodeCreate) -> Node:
        return await self._store.create_node(data)

    async def get(self, id: str) -> Node:
        return await self._store.get_node(id)

    async def update(self, id: str, data: NodeUpdate) -> Node:
        return await self._store.update_node(id, data)

    async def delete(self, id: str) -> None:
        await self._store.delete_node(id)

    async def list_paginated(self, skip: int = 0, limit: int = 20) -> Page[Node]:
        items, total = await self._store.list_nodes_paginated(skip, limit)
        return Page(items=items, total=total, skip=skip, limit=limit)


class EdgeRepository(BaseRepository[Edge, EdgeCreate, EdgeUpdate]):
    async def create(self, data: EdgeCreate) -> Edge:
        return await self._store.create_edge(data)

    async def get(self, id: str) -> Edge:
        return await self._store.get_edge(id)

    async def update(self, id: str, data: EdgeUpdate) -> Edge:
        return await self._store.update_edge(id, data)

    async def delete(self, id: str) -> None:
        await self._store.delete_edge(id)

    async def list_paginated(self, skip: int = 0, limit: int = 20) -> Page[Edge]:
        items, total = await self._store.list_edges_paginated(skip, limit)
        return Page(items=items, total=total, skip=skip, limit=limit)