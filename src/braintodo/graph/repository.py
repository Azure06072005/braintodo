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
    in-memory test double). Subclasses just wire up which GraphStore methods
    back each operation - they hold no storage logic of their own."""

    def __init__(self, store: GraphStore) -> None:
        self._store = store

    def create(self, data: CreateT) -> T:
        raise NotImplementedError

    def get(self, id: str) -> T:
        raise NotImplementedError

    def update(self, id: str, data: UpdateT) -> T:
        raise NotImplementedError

    def delete(self, id: str) -> None:
        raise NotImplementedError

    def list_paginated(self, skip: int = 0, limit: int = 20) -> Page[T]:
        raise NotImplementedError


class NodeRepository(BaseRepository[Node, NodeCreate, NodeUpdate]):
    def create(self, data: NodeCreate) -> Node:
        return self._store.create_node(data)

    def get(self, id: str) -> Node:
        return self._store.get_node(id)

    def update(self, id: str, data: NodeUpdate) -> Node:
        return self._store.update_node(id, data)

    def delete(self, id: str) -> None:
        self._store.delete_node(id)

    def list_paginated(self, skip: int = 0, limit: int = 20) -> Page[Node]:
        items = self._store.list_nodes()
        total = len(items)
        return Page(items=items[skip:skip+limit], total=total, skip=skip, limit=limit)


class EdgeRepository(BaseRepository[Edge, EdgeCreate, EdgeUpdate]):
    def create(self, data: EdgeCreate) -> Edge:
        return self._store.create_edge(data)

    def get(self, id: str) -> Edge:
        return self._store.get_edge(id)

    def update(self, id: str, data: EdgeUpdate) -> Edge:
        return self._store.update_edge(id, data)

    def delete(self, id: str) -> None:
        self._store.delete_edge(id)

    def list_paginated(self, skip: int = 0, limit: int = 20) -> Page[Edge]:
        items = self._store.list_edges()
        total = len(items)
        return Page(items=items[skip:skip+limit], total=total, skip=skip, limit=limit)