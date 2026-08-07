import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from braintodo.api.auth import get_email_sender
from braintodo.auth.email_sender import FakeEmailSender
from braintodo.db.base import Base, get_session
from braintodo.main import app


@pytest.fixture(autouse=True)
async def override_dependencies():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    fake_email = FakeEmailSender()

    async def _get_session():
        async with factory() as session:
            yield session

    app.dependency_overrides[get_session] = _get_session
    app.dependency_overrides[get_email_sender] = lambda: fake_email
    yield fake_email
    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_register_then_verify_then_login(
    client: AsyncClient, override_dependencies: FakeEmailSender
) -> None:
    resp = await client.post("/auth/register", json={"email": "a@example.com", "password": "secret123"})
    assert resp.status_code == 201
    assert resp.json()["is_verified"] is False

    body = override_dependencies.sent[0]["body"]
    token = body.split("token=")[1].split("\n")[0]

    resp = await client.get("/auth/verify", params={"token": token})
    assert resp.status_code == 200
    assert resp.json()["is_verified"] is True

    resp = await client.post("/auth/login", json={"email": "a@example.com", "password": "secret123"})
    assert resp.status_code == 200
    access_token = resp.json()["access_token"]

    resp = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "a@example.com"


async def test_login_unverified_returns_403(
    client: AsyncClient, override_dependencies: FakeEmailSender
) -> None:
    await client.post("/auth/register", json={"email": "a@example.com", "password": "secret123"})
    resp = await client.post("/auth/login", json={"email": "a@example.com", "password": "secret123"})
    assert resp.status_code == 403


async def test_me_without_token_returns_401(client: AsyncClient) -> None:
    resp = await client.get("/auth/me")
    assert resp.status_code == 401