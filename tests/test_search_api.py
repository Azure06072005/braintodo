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


async def test_search_finds_node_by_keyword(
    client: AsyncClient, override_dependencies: InMemoryGraphStore
) -> None:
    store = override_dependencies
    node = (await client.post("/nodes", json={"title": "Neural networks"})).json()
    other = (await client.post("/nodes", json={"title": "Gardening tips"})).json()
    # FakeEmbeddingProvider's vectors aren't semantically meaningful (all
    # components positive, so cosine similarity is always high regardless of
    # topic - see its docstring). Zero them out so only the keyword signal
    # is under test here; real semantic ranking is covered by test_search.py.
    await store.update_node(node["id"], NodeUpdate(embedding=[0.0] * 8))
    await store.update_node(other["id"], NodeUpdate(embedding=[0.0] * 8))

    resp = await client.get("/search", params={"q": "neural"})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["matches"]) == 1
    assert body["matches"][0]["node_id"] == node["id"]


async def test_search_includes_neighboring_subgraph(client: AsyncClient) -> None:
    a = (await client.post("/nodes", json={"title": "Neural networks"})).json()
    b = (await client.post("/nodes", json={"title": "Backpropagation"})).json()
    await client.post("/edges", json={"source_id": a["id"], "target_id": b["id"]})

    resp = await client.get("/search", params={"q": "neural", "depth": 1})
    assert resp.status_code == 200
    body = resp.json()
    subgraph_ids = {n["id"] for n in body["subgraph_nodes"]}
    assert subgraph_ids == {a["id"], b["id"]}
    assert len(body["subgraph_edges"]) == 1


async def test_no_match_returns_empty_result(
    client: AsyncClient, override_dependencies: InMemoryGraphStore
) -> None:
    store = override_dependencies
    node = (await client.post("/nodes", json={"title": "Gardening tips"})).json()
    await store.update_node(node["id"], NodeUpdate(embedding=[0.0] * 8))

    resp = await client.get("/search", params={"q": "quantum computing"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["matches"] == []
    assert body["subgraph_nodes"] == []
    assert body["subgraph_edges"] == []