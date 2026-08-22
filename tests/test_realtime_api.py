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
def realtime_client():
    """Yields (client, manager, register_user) where register_user(email)
    registers+verifies+logs in a user and returns (auth_header, token, ws_url)
    - `ws_url` already has `?token=...` baked in, since F013 requires it for
    the WebSocket handshake (browsers can't set custom headers there)."""
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

    def register_user(email: str = "user@example.com", password: str = "secret123"):
        sync_client.post("/auth/register", json={"email": email, "password": password})
        body = fake_email.sent[-1]["body"]
        token = body.split("token=")[1].split("\n")[0]
        sync_client.get("/auth/verify", params={"token": token})
        resp = sync_client.post("/auth/login", json={"email": email, "password": password})
        access_token = resp.json()["access_token"]
        auth_header = {"Authorization": f"Bearer {access_token}"}
        ws_url = f"/ws?token={access_token}"
        return auth_header, access_token, ws_url

    yield sync_client, manager, register_user

    app.dependency_overrides.clear()
    asyncio.run(engine.dispose())


def test_node_created_event_is_broadcast(realtime_client) -> None:
    client, _manager, register_user = realtime_client
    auth, _token, ws_url = register_user()

    with client.websocket_connect(ws_url) as ws:
        resp = client.post("/nodes", json={"title": "A"}, headers=auth)
        assert resp.status_code == 201
        message = ws.receive_json()

    assert message["event"] == "node_created"
    assert message["data"]["title"] == "A"


def test_node_deleted_event_is_broadcast(realtime_client) -> None:
    client, _manager, register_user = realtime_client
    auth, _token, ws_url = register_user()
    node = client.post("/nodes", json={"title": "A"}, headers=auth).json()

    with client.websocket_connect(ws_url) as ws:
        resp = client.delete(f"/nodes/{node['id']}", headers=auth)
        assert resp.status_code == 204
        message = ws.receive_json()

    assert message == {"event": "node_deleted", "data": {"id": node["id"]}}


def test_edge_created_event_is_broadcast(realtime_client) -> None:
    client, _manager, register_user = realtime_client
    auth, _token, ws_url = register_user()
    a = client.post("/nodes", json={"title": "A"}, headers=auth).json()
    b = client.post("/nodes", json={"title": "B"}, headers=auth).json()

    with client.websocket_connect(ws_url) as ws:
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


def test_multiple_clients_of_the_same_user_all_receive_the_same_event(realtime_client) -> None:
    client, _manager, register_user = realtime_client
    auth, _token, ws_url = register_user()

    with client.websocket_connect(ws_url) as ws1, client.websocket_connect(ws_url) as ws2:
        client.post("/nodes", json={"title": "A"}, headers=auth)
        msg1 = ws1.receive_json()
        msg2 = ws2.receive_json()

    assert msg1["event"] == msg2["event"] == "node_created"


# -- F013: per-user isolation -----------------------------------------------


def test_connecting_without_a_token_is_rejected() -> None:
    from starlette.websockets import WebSocketDisconnect

    from braintodo.main import app as bare_app

    client = TestClient(bare_app)
    with pytest.raises(WebSocketDisconnect), client.websocket_connect("/ws"):
        pass


def test_connecting_with_an_invalid_token_is_rejected(realtime_client) -> None:
    from starlette.websockets import WebSocketDisconnect

    client, _manager, _register_user = realtime_client
    with (
        pytest.raises(WebSocketDisconnect),
        client.websocket_connect("/ws?token=not-a-real-token"),
    ):
        pass


def test_user_a_does_not_receive_user_bs_events(realtime_client) -> None:
    client, _manager, register_user = realtime_client
    auth_a, _token_a, ws_url_a = register_user(email="a@example.com")
    auth_b, _token_b, _ws_url_b = register_user(email="b@example.com")

    with client.websocket_connect(ws_url_a) as ws_a:
        # B creates a node - A's socket should NOT receive this event.
        client.post("/nodes", json={"title": "B's idea"}, headers=auth_b)

        # A creates their own node - A's socket SHOULD receive only this one.
        client.post("/nodes", json={"title": "A's idea"}, headers=auth_a)
        message = ws_a.receive_json()

    assert message["event"] == "node_created"
    assert message["data"]["title"] == "A's idea"


def test_user_bs_socket_receives_only_bs_events(realtime_client) -> None:
    client, _manager, register_user = realtime_client
    auth_a, _token_a, _ws_url_a = register_user(email="a@example.com")
    auth_b, _token_b, ws_url_b = register_user(email="b@example.com")

    with client.websocket_connect(ws_url_b) as ws_b:
        client.post("/nodes", json={"title": "A's idea"}, headers=auth_a)
        client.post("/nodes", json={"title": "B's idea"}, headers=auth_b)
        message = ws_b.receive_json()

    assert message["data"]["title"] == "B's idea"