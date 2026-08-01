import pytest
from httpx import ASGITransport, AsyncClient

from braintodo.api.nodes import get_embedder, get_store
from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.main import app
from braintodo.models.node import NodeUpdate


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


async def test_suggests_link_between_similar_nodes(
    client: AsyncClient, override_dependencies: InMemoryGraphStore
) -> None:
    store = override_dependencies
    a = (await client.post("/nodes", json={"title": "A"})).json()
    b = (await client.post("/nodes", json={"title": "B"})).json()
    await store.update_node(a["id"], NodeUpdate(graph_embedding=[1.0, 0.0]))
    await store.update_node(b["id"], NodeUpdate(graph_embedding=[1.0, 0.0]))

    resp = await client.get("/links/suggestions")
    assert resp.status_code == 200
    suggestions = resp.json()
    assert len(suggestions) == 1
    assert {suggestions[0]["source_id"], suggestions[0]["target_id"]} == {
        a["id"],
        b["id"],
    }
    assert suggestions[0]["score"] == pytest.approx(1.0)


async def test_no_suggestions_on_empty_graph(client: AsyncClient) -> None:
    resp = await client.get("/links/suggestions")
    assert resp.status_code == 200
    assert resp.json() == []