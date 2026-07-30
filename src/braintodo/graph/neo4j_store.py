import uuid

from neo4j import AsyncDriver, AsyncGraphDatabase

from braintodo.config import settings
from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate

_NODE_LABEL = "Idea"
_REL_TYPE = "RELATION"


class Neo4jGraphStore:
    """Production GraphStore backend, backed by a real Neo4j database.
    All I/O uses the async neo4j driver."""

    def __init__(self, driver: AsyncDriver | None = None) -> None:
        self._driver = driver or AsyncGraphDatabase.driver(
            settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
        )

    async def close(self) -> None:
        await self._driver.close()

    # -- Nodes --------------------------------------------------------
    async def create_node(self, data: NodeCreate) -> Node:
        node_id = str(uuid.uuid4())
        node = Node(id=node_id, **data.model_dump())
        async with self._driver.session() as session:
            await session.run(
                f"CREATE (n:{_NODE_LABEL} $props)",
                props=node.model_dump(),
            )
        return node

    async def get_node(self, node_id: str) -> Node:
        async with self._driver.session() as session:
            record = await (
                await session.run(
                    f"MATCH (n:{_NODE_LABEL} {{id: $id}}) RETURN n",
                    id=node_id,
                )
            ).single()
        if record is None:
            raise NodeNotFoundError(node_id)
        return Node(**dict(record["n"]))

    async def update_node(self, node_id: str, data: NodeUpdate) -> Node:
        updates = data.model_dump(exclude_unset=True, exclude_none=True)
        async with self._driver.session() as session:
            record = await (
                await session.run(
                    f"MATCH (n:{_NODE_LABEL} {{id: $id}}) SET n += $updates RETURN n",
                    id=node_id,
                    updates=updates,
                )
            ).single()
        if record is None:
            raise NodeNotFoundError(node_id)
        return Node(**dict(record["n"]))

    async def delete_node(self, node_id: str) -> None:
        async with self._driver.session() as session:
            result = await (
                await session.run(
                    f"MATCH (n:{_NODE_LABEL} {{id: $id}}) DETACH DELETE n RETURN count(n) AS c",
                    id=node_id,
                )
            ).single()
        if result is None or result["c"] == 0:
            raise NodeNotFoundError(node_id)

    async def list_nodes(self) -> list[Node]:
        async with self._driver.session() as session:
            records = await session.run(f"MATCH (n:{_NODE_LABEL}) RETURN n")
            return [Node(**dict(r["n"])) async for r in records]

    async def list_nodes_paginated(self, skip: int, limit: int) -> tuple[list[Node], int]:
        async with self._driver.session() as session:
            records = await session.run(
                f"MATCH (n:{_NODE_LABEL}) RETURN n ORDER BY n.id SKIP $skip LIMIT $limit",
                skip=skip,
                limit=limit,
            )
            items = [Node(**dict(r["n"])) async for r in records]
            count_record = await (
                await session.run(f"MATCH (n:{_NODE_LABEL}) RETURN count(n) AS c")
            ).single()
        total = count_record["c"] if count_record else 0
        return items, total

    # -- Edges ----------------------------------------------------------
    async def create_edge(self, data: EdgeCreate) -> Edge:
        edge_id = str(uuid.uuid4())
        edge = Edge(id=edge_id, **data.model_dump())
        async with self._driver.session() as session:
            record = await (
                await session.run(
                    f"""
                    MATCH (a:{_NODE_LABEL} {{id: $source_id}})
                    MATCH (b:{_NODE_LABEL} {{id: $target_id}})
                    CREATE (a)-[r:{_REL_TYPE} $props]->(b)
                    RETURN r
                    """,
                    source_id=data.source_id,
                    target_id=data.target_id,
                    props=edge.model_dump(),
                )
            ).single()
        if record is None:
            missing = await self._first_missing_node(data.source_id, data.target_id)
            raise NodeNotFoundError(missing)
        return edge

    async def _first_missing_node(self, source_id: str, target_id: str) -> str:
        async with self._driver.session() as session:
            for candidate in (source_id, target_id):
                exists = await (
                    await session.run(
                        f"MATCH (n:{_NODE_LABEL} {{id: $id}}) RETURN n",
                        id=candidate,
                    )
                ).single()
                if exists is None:
                    return candidate
        return source_id

    async def get_edge(self, edge_id: str) -> Edge:
        async with self._driver.session() as session:
            record = await (
                await session.run(
                    f"MATCH ()-[r:{_REL_TYPE} {{id: $id}}]->() RETURN r",
                    id=edge_id,
                )
            ).single()
        if record is None:
            raise EdgeNotFoundError(edge_id)
        return Edge(**dict(record["r"]))

    async def update_edge(self, edge_id: str, data: EdgeUpdate) -> Edge:
        updates = data.model_dump(exclude_unset=True, exclude_none=True)
        async with self._driver.session() as session:
            record = await (
                await session.run(
                    f"MATCH ()-[r:{_REL_TYPE} {{id: $id}}]->() SET r += $updates RETURN r",
                    id=edge_id,
                    updates=updates,
                )
            ).single()
        if record is None:
            raise EdgeNotFoundError(edge_id)
        return Edge(**dict(record["r"]))

    async def delete_edge(self, edge_id: str) -> None:
        async with self._driver.session() as session:
            result = await (
                await session.run(
                    f"MATCH ()-[r:{_REL_TYPE} {{id: $id}}]->() DELETE r RETURN count(r) AS c",
                    id=edge_id,
                )
            ).single()
        if result is None or result["c"] == 0:
            raise EdgeNotFoundError(edge_id)

    async def list_edges(self) -> list[Edge]:
        async with self._driver.session() as session:
            records = await session.run(f"MATCH ()-[r:{_REL_TYPE}]->() RETURN r")
            return [Edge(**dict(r["r"])) async for r in records]

    async def list_edges_paginated(self, skip: int, limit: int) -> tuple[list[Edge], int]:
        async with self._driver.session() as session:
            records = await session.run(
                f"MATCH ()-[r:{_REL_TYPE}]->() RETURN r ORDER BY r.id SKIP $skip LIMIT $limit",
                skip=skip,
                limit=limit,
            )
            items = [Edge(**dict(r["r"])) async for r in records]
            count_record = await (
                await session.run(f"MATCH ()-[r:{_REL_TYPE}]->() RETURN count(r) AS c")
            ).single()
        total = count_record["c"] if count_record else 0
        return items, total