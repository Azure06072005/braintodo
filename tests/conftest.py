import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from braintodo.api.auth import get_email_sender
from braintodo.api.nodes import get_embedder, get_store
from braintodo.auth.email_sender import FakeEmailSender
from braintodo.db.base import Base, get_session
from braintodo.embedding.fake_provider import FakeEmbeddingProvider
from braintodo.graph.memory_store import InMemoryGraphStore
from braintodo.main import app


@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as s:
        yield s
    await engine.dispose()


@pytest.fixture
async def app_client():
    """Yields (client, store, make_token). make_token(email=, password=)
    runs register -> verify -> login and returns a bearer token."""
    store = InMemoryGraphStore()
    fake_email = FakeEmailSender()
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def _get_session():
        async with factory() as s:
            yield s

    app.dependency_overrides[get_store] = lambda: store
    app.dependency_overrides[get_embedder] = lambda: FakeEmbeddingProvider()
    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_email_sender] = lambda: fake_email

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:

        async def make_token(
            email: str = "user@example.com", password: str = "secret123"
        ) -> str:
            resp = await client.post(
                "/auth/register", json={"email": email, "password": password}
            )
            assert resp.status_code == 201, resp.text
            body = fake_email.sent[-1]["body"]
            token = body.split("token=")[1].split("\n")[0]
            resp = await client.get("/auth/verify", params={"token": token})
            assert resp.status_code == 200, resp.text
            resp = await client.post(
                "/auth/login", json={"email": email, "password": password}
            )
            assert resp.status_code == 200, resp.text
            return resp.json()["access_token"]

        yield client, store, make_token

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def auth_headers(app_client):
    client, store, make_token = app_client
    token = await make_token()
    headers = {"Authorization": f"Bearer {token}"}
    yield client, headers, store