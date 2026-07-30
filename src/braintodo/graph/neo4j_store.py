import uuid

from neo4j import Driver, GraphDatabase

from braintodo.config import settings
from braintodo.graph.base import EdgeNotFoundError, NodeNotFoundError
from braintodo.models.edge import Edge, EdgeCreate, EdgeUpdate
from braintodo.models.node import Node, NodeCreate, NodeUpdate

# All ideas are stored as `:Idea` nodes. All relationships between ideas are
# stored as a single generic `:RELATION` relationship type, with the
# user-facing semantic type kept in the `relation_type` property. This avoids
# building Cypher queries with a dynamically-interpolated relationship type.
_NODE_LABEL = "Idea"
_REL_TYPE = "RELATION"


class Neo4jGraphStore:
    """Production GraphStore backend, backed by a real Neo4j database."""

    def __init__(self, driver: Driver | None = None) -> None:
        self._driver = driver or GraphDatabase.driver(
            settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
        )

    def close(self) -> None:
        self._driver.close()

    # -- Nodes --------------------------------------------------------
    def create_node(self, data: NodeCreate) -> Node:
        node_id = str(uuid.uuid4())
        node = Node(id=node_id, **data.model_dump())
        with self._driver.session() as session:
            session.run(
                f"CREATE (n:{_NODE_LABEL} $props)",
                props=node.model_dump(),
            )
        return node

    def get_node(self, node_id: str) -> Node:
        with self._driver.session() as session:
            record = session.run(
                f"MATCH (n:{_NODE_LABEL} {{id: $id}}) RETURN n",
                id=node_id,
            ).single()
        if record is None:
            raise NodeNotFoundError(node_id)
        return Node(**dict(record["n"]))

    def update_node(self, node_id: str, data: NodeUpdate) -> Node:
        updates = data.model_dump(exclude_unset=True, exclude_none=True)
        with self._driver.session() as session:
            record = session.run(
                f"MATCH (n:{_NODE_LABEL} {{id: $id}}) SET n += $updates RETURN n",
                id=node_id,
                updates=updates,
            ).single()
        if record is None:
            raise NodeNotFoundError(node_id)
        return Node(**dict(record["n"]))

    def delete_node(self, node_id: str) -> None:
        with self._driver.session() as session:
            result = session.run(
                f"MATCH (n:{_NODE_LABEL} {{id: $id}}) DETACH DELETE n RETURN count(n) AS c",
                id=node_id,
            ).single()
        if result is None or result["c"] == 0:
            raise NodeNotFoundError(node_id)

    def list_nodes(self) -> list[Node]:
        with self._driver.session() as session:
            records = session.run(f"MATCH (n:{_NODE_LABEL}) RETURN n")
            return [Node(**dict(r["n"])) for r in records]

    # -- Edges ----------------------------------------------------------
    def create_edge(self, data: EdgeCreate) -> Edge:
        edge_id = str(uuid.uuid4())
        edge = Edge(id=edge_id, **data.model_dump())
        with self._driver.session() as session:
            record = session.run(
                f"""
                MATCH (a:{_NODE_LABEL} {{id: $source_id}})
                MATCH (b:{_NODE_LABEL} {{id: $target_id}})
                CREATE (a)-[r:{_REL_TYPE} $props]->(b)
                RETURN r
                """,
                source_id=data.source_id,
                target_id=data.target_id,
                props=edge.model_dump(),
            ).single()
        if record is None:
            # One or both endpoint nodes don't exist -> caller (API layer)
            # translates this into an HTTP 400, not a 404.
            missing = self._first_missing_node(data.source_id, data.target_id)
            raise NodeNotFoundError(missing)
        return edge

    def _first_missing_node(self, source_id: str, target_id: str) -> str:
        with self._driver.session() as session:
            for candidate in (source_id, target_id):
                exists = session.run(
                    f"MATCH (n:{_NODE_LABEL} {{id: $id}}) RETURN n",
                    id=candidate,
                ).single()
                if exists is None:
                    return candidate
        return source_id

    def get_edge(self, edge_id: str) -> Edge:
        with self._driver.session() as session:
            record = session.run(
                f"MATCH ()-[r:{_REL_TYPE} {{id: $id}}]->() RETURN r",
                id=edge_id,
            ).single()
        if record is None:
            raise EdgeNotFoundError(edge_id)
        return Edge(**dict(record["r"]))

    def update_edge(self, edge_id: str, data: EdgeUpdate) -> Edge:
        updates = data.model_dump(exclude_unset=True, exclude_none=True)
        with self._driver.session() as session:
            record = session.run(
                f"MATCH ()-[r:{_REL_TYPE} {{id: $id}}]->() SET r += $updates RETURN r",
                id=edge_id,
                updates=updates,
            ).single()
        if record is None:
            raise EdgeNotFoundError(edge_id)
        return Edge(**dict(record["r"]))

    def delete_edge(self, edge_id: str) -> None:
        with self._driver.session() as session:
            result = session.run(
                f"MATCH ()-[r:{_REL_TYPE} {{id: $id}}]->() DELETE r RETURN count(r) AS c",
                id=edge_id,
            ).single()
        if result is None or result["c"] == 0:
            raise EdgeNotFoundError(edge_id)

    def list_edges(self) -> list[Edge]:
        with self._driver.session() as session:
            records = session.run(f"MATCH ()-[r:{_REL_TYPE}]->() RETURN r")
            return [Edge(**dict(r["r"])) for r in records]