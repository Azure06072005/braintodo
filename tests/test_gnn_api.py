import pytest

from braintodo.api.gnn import get_graph_embedder
from braintodo.gnn.fake_graph_embedder import FakeGraphEmbedder
from braintodo.main import app


@pytest.fixture(autouse=True)
def override_gnn_embedder():
    app.dependency_overrides[get_graph_embedder] = lambda: FakeGraphEmbedder()
    yield
    app.dependency_overrides.pop(get_graph_embedder, None)


async def test_recompute_graph_embeddings(auth_headers) -> None:
    client, headers, _store = auth_headers
    a = (await client.post("/nodes", json={"title": "A"}, headers=headers)).json()
    b = (await client.post("/nodes", json={"title": "B"}, headers=headers)).json()
    await client.post(
        "/edges", json={"source_id": a["id"], "target_id": b["id"]}, headers=headers
    )

    resp = await client.post("/gnn/recompute", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"updated": 2}

    a_after = (await client.get(f"/nodes/{a['id']}", headers=headers)).json()
    assert a_after["graph_embedding"] is not None


async def test_recompute_on_empty_graph_returns_zero(auth_headers) -> None:
    client, headers, _store = auth_headers
    resp = await client.post("/gnn/recompute", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"updated": 0}