from typing import Protocol

from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate


class NodeNotFoundError(Exception):
    """Raised when a node lookup fails, including when the node exists but
    is owned by a different user (F020: ownership is not leaked to the
    caller as a distinct error, to avoid revealing other users' node ids)."""

    def __init__(self, node_id: str) -> None:
        self.node_id = node_id
        super().__init__(f"Node not found: {node_id}")


class EdgeNotFoundError(Exception):
    """Raised when an edge lookup fails, including when the edge exists but
    is owned by a different user (see NodeNotFoundError)."""

    def __init__(self, edge_id: str) -> None:
        self.edge_id = edge_id
        super().__init__(f"Edge not found: {edge_id}")


class GraphStore(Protocol):
    """Backend-agnostic interface for the idea graph. The API layer depends only
    on this Protocol, never on a concrete backend (Neo4j or in-memory).

    F020: every method is scoped to a single owner_id, so each user only ever
    sees, creates, or mutates their own nodes/edges. Passing an owner_id that
    doesn't own a given node/edge behaves exactly like the node/edge not
    existing (NodeNotFoundError / EdgeNotFoundError), not a separate
    "forbidden" case.
    """

    async def create_node(self, data: NodeCreate, owner_id: str) -> Node: ...
    async def get_node(self, node_id: str, owner_id: str) -> Node: ...
    async def update_node(self, node_id: str, data: NodeUpdate, owner_id: str) -> Node: ...
    async def delete_node(self, node_id: str, owner_id: str) -> None: ...
    async def list_nodes(self, owner_id: str) -> list[Node]: ...
    async def list_nodes_paginated(
        self, skip: int, limit: int, owner_id: str, node_type: str | None = None
    ) -> tuple[list[Node], int]: ...
    # F025: set/clear completed_at directly, bypassing NodeUpdate's
    # exclude_none semantics (a normal update can't clear a field back to
    # null - reopen needs to).
    async def complete_node(self, node_id: str, owner_id: str) -> Node: ...
    async def reopen_node(self, node_id: str, owner_id: str) -> Node: ...

    async def create_edge(self, data: EdgeCreate, owner_id: str) -> Edge: ...
    async def get_edge(self, edge_id: str, owner_id: str) -> Edge: ...
    async def update_edge(self, edge_id: str, data: EdgeUpdate, owner_id: str) -> Edge: ...
    async def delete_edge(self, edge_id: str, owner_id: str) -> None: ...
    async def list_edges(self, owner_id: str) -> list[Edge]: ...
    async def list_edges_paginated(
        self, skip: int, limit: int, owner_id: str
    ) -> tuple[list[Edge], int]: ...