import pytest
from httpx import ASGITransport, AsyncClient

from braintodo.api.gnn import get_graph_embedder
from braintodo.api.nodes import get_embedder, get_store
from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.gnn.fake_graph_embedder import FakeGraphEmbedder
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.main import app


@pytest.fixture(autouse=True)
def override_dependencies():
    store = InMemoryGraphStore()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_embedder] = lambda: FakeEmbeddingProvider()
    app.dependency_overrides[get_graph_embedder] = lambda: FakeGraphEmbedder()
    yield store
    app.dependency_overrides.clear()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_recompute_graph_embeddings(client: AsyncClient) -> None:
    a = (await client.post("/nodes", json={"title": "A"})).json()
    b = (await client.post("/nodes", json={"title": "B"})).json()
    await client.post("/edges", json={"source_id": a["id"], "target_id": b["id"]})

    resp = await client.post("/gnn/recompute")
    assert resp.status_code == 200
    assert resp.json() == {"updated": 2}

    a_after = (await client.get(f"/nodes/{a['id']}")).json()
    assert a_after["graph_embedding"] is not None


async def test_recompute_on_empty_graph_returns_zero(client: AsyncClient) -> None:
    resp = await client.post("/gnn/recompute")
    assert resp.status_code == 200
    assert resp.json() == {"updated": 0}