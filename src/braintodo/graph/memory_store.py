import uuid

import networkx as nx

from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate


class InMemoryGraphStore:
    """NetworkX-backed test double for GraphStore. Used only in unit tests,
    never as the application's real backend (see Neo4jGraphStore for that).
    Methods are declared `async def` to satisfy the GraphStore Protocol, but
    do no actual I/O so they return immediately."""

    def __init__(self) -> None:
        self._graph: nx.MultiDiGraph = nx.MultiDiGraph()

    # -- Nodes --------------------------------------------------------
    async def create_node(self, data: NodeCreate) -> Node:
        node_id = str(uuid.uuid4())
        node = Node(id=node_id, **data.model_dump())
        self._graph.add_node(node_id, **node.model_dump())
        return node

    async def get_node(self, node_id: str) -> Node:
        if node_id not in self._graph.nodes:
            raise NodeNotFoundError(node_id)
        return Node(**self._graph.nodes[node_id])

    async def update_node(self, node_id: str, data: NodeUpdate) -> Node:
        existing = await self.get_node(node_id)
        updated = existing.model_copy(
            update=data.model_dump(exclude_unset=True, exclude_none=True)
        )
        self._graph.nodes[node_id].update(updated.model_dump())
        return updated

    async def delete_node(self, node_id: str) -> None:
        if node_id not in self._graph.nodes:
            raise NodeNotFoundError(node_id)
        self._graph.remove_node(node_id)

    async def list_nodes(self) -> list[Node]:
        return [Node(**attrs) for _, attrs in self._graph.nodes(data=True)]

    async def list_nodes_paginated(self, skip: int, limit: int) -> tuple[list[Node], int]:
        all_nodes = sorted(
            (Node(**attrs) for _, attrs in self._graph.nodes(data=True)),
            key=lambda n: n.id,
        )
        return all_nodes[skip : skip + limit], len(all_nodes)

    # -- Edges ----------------------------------------------------------
    async def create_edge(self, data: EdgeCreate) -> Edge:
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

    async def get_edge(self, edge_id: str) -> Edge:
        u, v = self._find_edge_location(edge_id)
        return Edge(**self._graph.edges[u, v, edge_id])

    async def update_edge(self, edge_id: str, data: EdgeUpdate) -> Edge:
        existing = await self.get_edge(edge_id)
        updated = existing.model_copy(
            update=data.model_dump(exclude_unset=True, exclude_none=True)
        )
        u, v = self._find_edge_location(edge_id)
        self._graph.edges[u, v, edge_id].update(updated.model_dump())
        return updated

    async def delete_edge(self, edge_id: str) -> None:
        u, v = self._find_edge_location(edge_id)
        self._graph.remove_edge(u, v, edge_id)

    async def list_edges(self) -> list[Edge]:
        return [Edge(**attrs) for _, _, attrs in self._graph.edges(data=True)]

    async def list_edges_paginated(self, skip: int, limit: int) -> tuple[list[Edge], int]:
        all_edges = sorted(
            (Edge(**attrs) for _, _, attrs in self._graph.edges(data=True)),
            key=lambda e: e.id,
        )
        return all_edges[skip : skip + limit], len(all_edges)
