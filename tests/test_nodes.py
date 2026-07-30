import pytest
from httpx import ASGITransport, AsyncClient

from braintodo.api.nodes import get_store
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.main import app


@pytest.fixture(autouse=True)
def override_store():
    store = InMemoryGraphStore()
    app.dependency_overrides[get_store] = lambda: store
    yield store
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_create_and_get_node(client: AsyncClient) -> None:
    resp = await client.post("/nodes", json={"title": "Idea 1"})
    assert resp.status_code == 201
    node_id = resp.json()["id"]
    resp = await client.get(f"/nodes/{node_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Idea 1"


async def test_list_nodes_paginated(client: AsyncClient) -> None:
    for i in range(5):
        await client.post("/nodes", json={"title": f"Idea {i}"})
    resp = await client.get("/nodes", params={"skip": 0, "limit": 2})
    body = resp.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2


async def test_create_edge_missing_node_returns_400(client: AsyncClient) -> None:
    resp = await client.post(
        "/edges", json={"source_id": "missing-a", "target_id": "missing-b"}
    )
    assert resp.status_code == 400
