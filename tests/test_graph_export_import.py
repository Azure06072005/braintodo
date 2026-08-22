import asyncio

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


def test_import_broadcasts_a_single_graph_imported_event() -> None:
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
    access_token = resp.json()["access_token"]
    auth_header = {"Authorization": f"Bearer {access_token}"}
    # F013: WebSocket handshakes can't carry an Authorization header from
    # browser JS, so the access token goes on the connection URL instead.
    ws_url = f"/ws?token={access_token}"

    payload = {"nodes": [{"id": "old-1", "owner_id": "old-owner", "title": "A"}], "edges": []}

    try:
        with sync_client.websocket_connect(ws_url) as ws:
            resp = sync_client.post("/graph/import", json=payload, headers=auth_header)
            assert resp.status_code == 200
            message = ws.receive_json()

        assert message == {
            "event": "graph_imported",
            "data": {"nodes_created": 1, "edges_created": 0, "edges_skipped": 0},
        }
    finally:
        app.dependency_overrides.clear()
        asyncio.run(engine.dispose())