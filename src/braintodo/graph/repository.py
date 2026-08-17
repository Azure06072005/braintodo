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


class Page(BaseModel, Generic[T]):  # noqa: UP046
    items: list[T]
    total: int
    skip: int
    limit: int


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

    async def list_paginated(self, owner_id: str, skip: int = 0, limit: int = 20) -> Page[Node]:
        items, total = await self._store.list_nodes_paginated(skip, limit, owner_id)
        return Page(items=items, total=total, skip=skip, limit=limit)


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