import asyncio

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from braintodo.api.auth import get_email_sender
from braintodo.api.nodes import get_embedder, get_store
from braintodo.auth.email_sender import FakeEmailSender
from braintodo.db.base import Base, get_session
from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.main import app
from braintodo.realtime.manager import ConnectionManager, get_manager


@pytest.fixture
def client_and_auth():
    store = InMemoryGraphStore()
    manager = ConnectionManager()
    fake_email = FakeEmailSender()
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async def _init_db():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(_init_db())
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _get_session():
        async with factory() as s:
            yield s

    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_embedder] = lambda: FakeEmbeddingProvider()
    app.dependency_overrides[get_manager] = lambda: manager
    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_email_sender] = lambda: fake_email
    sync_client = TestClient(app)

    email, password = "user@example.com", "secret123"
    sync_client.post("/auth/register", json={"email": email, "password": password})
    body = fake_email.sent[-1]["body"]
    token = body.split("token=")[1].split("\n")[0]
    sync_client.get("/auth/verify", params={"token": token})
    resp = sync_client.post("/auth/login", json={"email": email, "password": password})
    auth_header = {"Authorization": f"Bearer {resp.json()['access_token']}"}

    yield sync_client, auth_header

    app.dependency_overrides.clear()
    asyncio.run(engine.dispose())


def test_node_created_event_is_broadcast(client_and_auth) -> None:
    client, auth = client_and_auth
    with client.websocket_connect("/ws") as ws:
        resp = client.post("/nodes", json={"title": "A"}, headers=auth)
        assert resp.status_code == 201
        message = ws.receive_json()

    assert message["event"] == "node_created"
    assert message["data"]["title"] == "A"


def test_node_deleted_event_is_broadcast(client_and_auth) -> None:
    client, auth = client_and_auth
    node = client.post("/nodes", json={"title": "A"}, headers=auth).json()

    with client.websocket_connect("/ws") as ws:
        resp = client.delete(f"/nodes/{node['id']}", headers=auth)
        assert resp.status_code == 204
        message = ws.receive_json()

    assert message == {"event": "node_deleted", "data": {"id": node["id"]}}


def test_edge_created_event_is_broadcast(client_and_auth) -> None:
    client, auth = client_and_auth
    a = client.post("/nodes", json={"title": "A"}, headers=auth).json()
    b = client.post("/nodes", json={"title": "B"}, headers=auth).json()

    with client.websocket_connect("/ws") as ws:
        resp = client.post(
            "/edges",
            json={"source_id": a["id"], "target_id": b["id"]},
            headers=auth,
        )
        assert resp.status_code == 201
        message = ws.receive_json()

    assert message["event"] == "edge_created"
    assert message["data"]["source_id"] == a["id"]
    assert message["data"]["target_id"] == b["id"]


def test_multiple_clients_all_receive_the_same_event(client_and_auth) -> None:
    client, auth = client_and_auth
    with client.websocket_connect("/ws") as ws1, client.websocket_connect("/ws") as ws2:
        client.post("/nodes", json={"title": "A"}, headers=auth)
        msg1 = ws1.receive_json()
        msg2 = ws2.receive_json()

    assert msg1["event"] == msg2["event"] == "node_created"