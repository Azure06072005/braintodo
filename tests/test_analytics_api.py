import pytest
from httpx import ASGITransport, AsyncClient

from braintodo.api.nodes import get_embedder, get_store
from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.main import app


@pytest.fixture(autouse=True)
def override_dependencies():
    store = InMemoryGraphStore()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_embedder] = lambda: FakeEmbeddingProvider()
    yield store
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_returns_metrics_for_each_node(client: AsyncClient) -> None:
    a = (await client.post("/nodes", json={"title": "A"})).json()
    b = (await client.post("/nodes", json={"title": "B"})).json()
    await client.post("/edges", json={"source_id": a["id"], "target_id": b["id"]})

    resp = await client.get("/analytics/topology")
    assert resp.status_code == 200
    metrics = resp.json()
    assert {m["node_id"] for m in metrics} == {a["id"], b["id"]}
    for m in metrics:
        assert m["degree"] == 1


async def test_empty_graph_returns_empty_list(client: AsyncClient) -> None:
    resp = await client.get("/analytics/topology")
    assert resp.status_code == 200
    assert resp.json() == []