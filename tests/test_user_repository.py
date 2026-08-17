from braintodo.db.repository import TokenRepository, UserRepository


async def test_create_and_get_user_by_email(session) -> None:
    repo = UserRepository(session)
    user = await repo.create(email="a@example.com", hashed_password="hashed")
    fetched = await repo.get_by_email("a@example.com")
    assert fetched is not None
    assert fetched.id == user.id


async def test_get_missing_user_returns_none(session) -> None:
    repo = UserRepository(session)
    assert await repo.get_by_email("missing@example.com") is None


async def test_token_create_and_get_valid(session) -> None:
    users = UserRepository(session)
    tokens = TokenRepository(session)
    user = await users.create(email="a@example.com", hashed_password="hashed")

    token = await tokens.create(user.id)
    fetched = await tokens.get_valid(token.token)
    assert fetched is not None
    assert fetched.id == token.id


async def test_expired_or_missing_token_returns_none(session) -> None:
    tokens = TokenRepository(session)
    assert await tokens.get_valid("nonexistent") is None