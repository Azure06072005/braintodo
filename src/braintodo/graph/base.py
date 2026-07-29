from typing import Protocol

from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate


class NodeNotFoundError(Exception):
    """Raised when a node lookup fails."""

    def __init__(self, node_id: str) -> None:
        self.node_id = node_id
        super().__init__(f"Node not found: {node_id}")


class EdgeNotFoundError(Exception):
    """Raised when an edge lookup fails."""

    def __init__(self, edge_id: str) -> None:
        self.edge_id = edge_id
        super().__init__(f"Edge not found: {edge_id}")


class GraphStore(Protocol):
    """Backend-agnostic interface for the idea graph. The API layer depends only
    on this Protocol, never on a concrete backend (Neo4j or in-memory)."""

    # -- Nodes --------------------------------------------------------
    def create_node(self, data: NodeCreate) -> Node: ...

    def get_node(self, node_id: str) -> Node: ...

    def update_node(self, node_id: str, data: NodeUpdate) -> Node: ...

    def delete_node(self, node_id: str) -> None: ...

    def list_nodes(self) -> list[Node]: ...

    # -- Edges ----------------------------------------------------------
    def create_edge(self, data: EdgeCreate) -> Edge: ...

    def get_edge(self, edge_id: str) -> Edge: ...

    def update_edge(self, edge_id: str, data: EdgeUpdate) -> Edge: ...

    def delete_edge(self, edge_id: str) -> None: ...

    def list_edges(self) -> list[Edge]: ...
