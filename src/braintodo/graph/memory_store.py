import uuid

import networkx as nx

from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate


class InMemoryGraphStore:
    """NetworkX-backed test double for GraphStore. Used only in unit tests,
    never as the application's real backend (see Neo4jGraphStore for that)."""

    def __init__(self) -> None:
        self._graph: nx.MultiDiGraph = nx.MultiDiGraph()

    # -- Nodes --------------------------------------------------------
    def create_node(self, data: NodeCreate) -> Node:
        node_id = str(uuid.uuid4())
        node = Node(id=node_id, **data.model_dump())
        self._graph.add_node(node_id, **node.model_dump())
        return node

    def get_node(self, node_id: str) -> Node:
        if node_id not in self._graph.nodes:
            raise NodeNotFoundError(node_id)
        return Node(**self._graph.nodes[node_id])

    def update_node(self, node_id: str, data: NodeUpdate) -> Node:
        existing = self.get_node(node_id)
        updated = existing.model_copy(
            update=data.model_dump(exclude_unset=True, exclude_none=True)
        )
        self._graph.nodes[node_id].update(updated.model_dump())
        return updated

    def delete_node(self, node_id: str) -> None:
        if node_id not in self._graph.nodes:
            raise NodeNotFoundError(node_id)
        self._graph.remove_node(node_id)

    def list_nodes(self) -> list[Node]:
        return [Node(**attrs) for _, attrs in self._graph.nodes(data=True)]

    # -- Edges ----------------------------------------------------------
    def create_edge(self, data: EdgeCreate) -> Edge:
        if data.source_id not in self._graph.nodes:
            raise NodeNotFoundError(data.source_id)
        if data.target_id not in self._graph.nodes:
            raise NodeNotFoundError(data.target_id)
        edge_id = str(uuid.uuid4())
        edge = Edge(id=edge_id, **data.model_dump())
        self._graph.add_edge(
            data.source_id, data.target_id, key=edge_id, **edge.model_dump()
        )
        return edge

    def _find_edge_location(self, edge_id: str) -> tuple[str, str]:
        for u, v, key in self._graph.edges(keys=True):
            if key == edge_id:
                return u, v
        raise EdgeNotFoundError(edge_id)

    def get_edge(self, edge_id: str) -> Edge:
        u, v = self._find_edge_location(edge_id)
        return Edge(**self._graph.edges[u, v, edge_id])

    def update_edge(self, edge_id: str, data: EdgeUpdate) -> Edge:
        existing = self.get_edge(edge_id)
        updated = existing.model_copy(
            update=data.model_dump(exclude_unset=True, exclude_none=True)
        )
        u, v = self._find_edge_location(edge_id)
        self._graph.edges[u, v, edge_id].update(updated.model_dump())
        return updated

    def delete_edge(self, edge_id: str) -> None:
        u, v = self._find_edge_location(edge_id)
        self._graph.remove_edge(u, v, edge_id)

    def list_edges(self) -> list[Edge]:
        return [Edge(**attrs) for _, _, attrs in self._graph.edges(data=True)]
