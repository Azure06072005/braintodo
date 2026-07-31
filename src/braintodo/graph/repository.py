import asyncio
from typing import Generic, TypeVar

from pydantic import BaseModel

from braintodo.embedding.base import EmbeddingProvider
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
    def __init__(self, store: GraphStore, embedder: EmbeddingProvider) -> None: 
        super().__init__(store)
        self._embedder = embedder

    async def _compute_embedding(self, title: str, content: str) -> list[float]: 
        return await asyncio.to_thread(self._embedder.embed, f"{title} {content}")

    async def create(self, data: NodeCreate) -> Node:
        node = await self._store.create_node(data)
        embedding = await self._compute_embedding(node.title, node.content)
        return await self._store.update_node(node.id, NodeUpdate(embedding=embedding))

    async def get(self, id: str) -> Node:
        return await self._store.get_node(id)

    async def update(self, id: str, data: NodeUpdate) -> Node:
        node = await self._store.update_node(id, data)
        if data.title is not None or data.content is not None: 
            embedding = await self._compute_embedding(node.title, node.content)
            node = await self._store.update_node(id, NodeUpdate(embedding=embedding))
        return node

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