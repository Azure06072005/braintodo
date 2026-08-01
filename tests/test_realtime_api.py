import pytest
from fastapi.testclient import TestClient

from braintodo.api.nodes import get_embedder, get_store
from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.main import app
from braintodo.realtime.manager import ConnectionManager, get_manager


@pytest.fixture
def client():
    store = InMemoryGraphStore()
    manager = ConnectionManager()
    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_embedder] = lambda: FakeEmbeddingProvider()
    app.dependency_overrides[get_manager] = lambda: manager
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_node_created_event_is_broadcast(client: TestClient) -> None:
    with client.websocket_connect("/ws") as ws:
        resp = client.post("/nodes", json={"title": "A"})
        assert resp.status_code == 201
        message = ws.receive_json()

    assert message["event"] == "node_created"
    assert message["data"]["title"] == "A"


def test_node_deleted_event_is_broadcast(client: TestClient) -> None:
    node = client.post("/nodes", json={"title": "A"}).json()

    with client.websocket_connect("/ws") as ws:
        resp = client.delete(f"/nodes/{node['id']}")
        assert resp.status_code == 204
        message = ws.receive_json()

    assert message == {"event": "node_deleted", "data": {"id": node["id"]}}


def test_edge_created_event_is_broadcast(client: TestClient) -> None:
    a = client.post("/nodes", json={"title": "A"}).json()
    b = client.post("/nodes", json={"title": "B"}).json()

    with client.websocket_connect("/ws") as ws:
        resp = client.post(
            "/edges", json={"source_id": a["id"], "target_id": b["id"]}
        )
        assert resp.status_code == 201
        message = ws.receive_json()

    assert message["event"] == "edge_created"
    assert message["data"]["source_id"] == a["id"]
    assert message["data"]["target_id"] == b["id"]


def test_multiple_clients_all_receive_the_same_event(client: TestClient) -> None:
    with client.websocket_connect("/ws") as ws1, client.websocket_connect("/ws") as ws2:
        client.post("/nodes", json={"title": "A"})
        msg1 = ws1.receive_json()
        msg2 = ws2.receive_json()

    assert msg1["event"] == msg2["event"] == "node_created"