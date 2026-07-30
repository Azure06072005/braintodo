import pytest
from fastapi.testclient import TestClient

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
def client():
    with TestClient(app=app, base_url="http://test") as tc:
        yield tc


def test_create_and_get_node(client: TestClient) -> None:
    resp = client.post("/nodes", json={"title": "Idea 1"})
    assert resp.status_code == 201
    node_id = resp.json()["id"]

    resp = client.get(f"/nodes/{node_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Idea 1"


def test_get_missing_node_404(client: TestClient) -> None:
    resp = client.get("/nodes/does-not-exist")
    assert resp.status_code == 404


def test_list_nodes_paginated(client: TestClient) -> None:
    for i in range(5):
        client.post("/nodes", json={"title": f"Idea {i}"})

    resp = client.get("/nodes")
    body = resp.json()
    assert resp.status_code == 200
    assert len(body) == 5


def test_update_and_delete_node(client: TestClient) -> None:
    resp = client.post("/nodes", json={"title": "Original"})
    node_id = resp.json()["id"]

    resp = client.patch(f"/nodes/{node_id}", json={"title": "Renamed"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Renamed"

    resp = client.delete(f"/nodes/{node_id}")
    assert resp.status_code == 204

    resp = client.get(f"/nodes/{node_id}")
    assert resp.status_code == 404


def test_create_edge_missing_node_returns_400(client: TestClient) -> None:
    resp = client.post(
        "/edges", json={"source_id": "missing-a", "target_id": "missing-b"}
    )
    assert resp.status_code == 400


def test_edge_crud_and_pagination(client: TestClient) -> None:
    a = (client.post("/nodes", json={"title": "A"})).json()
    b = (client.post("/nodes", json={"title": "B"})).json()

    resp = client.post(
        "/edges", json={"source_id": a["id"], "target_id": b["id"]}
    )
    assert resp.status_code == 201
    edge_id = resp.json()["id"]

    resp = client.get("/edges")
    assert len(resp.json()) == 1

    resp = client.delete(f"/edges/{edge_id}")
    assert resp.status_code == 204
