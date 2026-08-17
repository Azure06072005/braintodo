import uuid

import networkx as nx

from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate


class InMemoryGraphStore:
    """NetworkX-backed test double for GraphStore. Used only in unit tests.
    F020: a single MultiDiGraph backs every user's data, but every
    read/write is filtered by owner_id so users only ever see their own
    nodes/edges.
    """

    def __init__(self) -> None:
        self._graph: nx.MultiDiGraph = nx.MultiDiGraph()

    async def create_node(self, data: NodeCreate, owner_id: str) -> Node:
        node_id = str(uuid.uuid4())
        node = Node(id=node_id, owner_id=owner_id, **data.model_dump())
        self._graph.add_node(node_id, **node.model_dump())
        return node

    def _get_owned_node(self, node_id: str, owner_id: str) -> Node:
        if node_id not in self._graph.nodes:
            raise NodeNotFoundError(node_id)
        node = Node(**self._graph.nodes[node_id])
        if node.owner_id != owner_id:
            raise NodeNotFoundError(node_id)
        return node

    async def get_node(self, node_id: str, owner_id: str) -> Node:
        return self._get_owned_node(node_id, owner_id)

    async def update_node(self, node_id: str, data: NodeUpdate, owner_id: str) -> Node:
        existing = self._get_owned_node(node_id, owner_id)
        updated = existing.model_copy(
            update=data.model_dump(exclude_unset=True, exclude_none=True)
        )
        self._graph.nodes[node_id].update(updated.model_dump())
        return updated

    async def delete_node(self, node_id: str, owner_id: str) -> None:
        self._get_owned_node(node_id, owner_id)
        self._graph.remove_node(node_id)

    async def list_nodes(self, owner_id: str) -> list[Node]:
        return [
            Node(**attrs)
            for _, attrs in self._graph.nodes(data=True)
            if attrs.get("owner_id") == owner_id
        ]

    async def list_nodes_paginated(
        self, skip: int, limit: int, owner_id: str
    ) -> tuple[list[Node], int]:
        all_nodes = sorted(
            (
                Node(**attrs)
                for _, attrs in self._graph.nodes(data=True)
                if attrs.get("owner_id") == owner_id
            ),
            key=lambda n: n.id,
        )
        return all_nodes[skip : skip + limit], len(all_nodes)

    async def create_edge(self, data: EdgeCreate, owner_id: str) -> Edge:
        # Both endpoints must exist AND belong to this owner - otherwise a
        # user could link to (and thereby learn the existence of) another
        # user's node.
        self._get_owned_node(data.source_id, owner_id)
        self._get_owned_node(data.target_id, owner_id)
        edge_id = str(uuid.uuid4())
        edge = Edge(id=edge_id, owner_id=owner_id, **data.model_dump())
        self._graph.add_edge(
            data.source_id, data.target_id, key=edge_id, **edge.model_dump()
        )
        return edge

    def _find_edge_location(self, edge_id: str, owner_id: str) -> tuple[str, str]:
        for u, v, key, attrs in self._graph.edges(keys=True, data=True):
            if key == edge_id and attrs.get("owner_id") == owner_id:
                return u, v
        raise EdgeNotFoundError(edge_id)

    async def get_edge(self, edge_id: str, owner_id: str) -> Edge:
        u, v = self._find_edge_location(edge_id, owner_id)
        return Edge(**self._graph.edges[u, v, edge_id])

    async def update_edge(self, edge_id: str, data: EdgeUpdate, owner_id: str) -> Edge:
        existing = await self.get_edge(edge_id, owner_id)
        updated = existing.model_copy(
            update=data.model_dump(exclude_unset=True, exclude_none=True)
        )
        u, v = self._find_edge_location(edge_id, owner_id)
        self._graph.edges[u, v, edge_id].update(updated.model_dump())
        return updated

    async def delete_edge(self, edge_id: str, owner_id: str) -> None:
        u, v = self._find_edge_location(edge_id, owner_id)
        self._graph.remove_edge(u, v, edge_id)

    async def list_edges(self, owner_id: str) -> list[Edge]:
        return [
            Edge(**attrs)
            for _, _, attrs in self._graph.edges(data=True)
            if attrs.get("owner_id") == owner_id
        ]

    async def list_edges_paginated(
        self, skip: int, limit: int, owner_id: str
    ) -> tuple[list[Edge], int]:
        all_edges = sorted(
            (
                Edge(**attrs)
                for _, _, attrs in self._graph.edges(data=True)
                if attrs.get("owner_id") == owner_id
            ),
            key=lambda e: e.id,
        )
        return all_edges[skip : skip + limit], len(all_edges)
