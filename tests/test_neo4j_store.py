"""Integration tests against a real Neo4j instance. Skipped automatically if
no live database is reachable (e.g. `docker compose up -d neo4j` wasn't run).
"""

import pytest
from neo4j import AsyncGraphDatabase
from neo4j.exceptions import ServiceUnavailable

from braintodo.config import settings
from braintodo.graph.migrations import run_migrations
from braintodo.graph.neo4j_store import Neo4jGraphStore
from braintodo.models.node import NodeCreate


async def _driver_is_reachable() -> bool:
    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
    )
    try:
        await driver.verify_connectivity()
        return True
    except ServiceUnavailable:
        return False
    finally:
        await driver.close()


@pytest.fixture
async def store():
    if not await _driver_is_reachable():
        pytest.skip("No live Neo4j instance reachable at settings.neo4j_uri")
    store = Neo4jGraphStore()
    await run_migrations(store._driver)
    yield store
    # Clean up everything this test session created.
    async with store._driver.session() as session:
        await session.run("MATCH (n:Idea) DETACH DELETE n")
    await store.close()


async def test_create_and_get_node_against_real_db(store: Neo4jGraphStore) -> None:
    node = await store.create_node(NodeCreate(title="Real DB idea"))
    fetched = await store.get_node(node.id)
    assert fetched == node