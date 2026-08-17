import pytest

from braintodo.auth.email_sender import FakeEmailSender
from braintodo.auth.security import decode_access_token
from braintodo.auth.service import (
    AuthService,
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
)
from braintodo.db.repository import TokenRepository, UserRepository

# fixture `session` tái sử dụng từ conftest chung (xem ghi chú bên dưới)


@pytest.fixture
def service(session):
    return AuthService(UserRepository(session), TokenRepository(session), FakeEmailSender())


async def test_register_sends_verification_email(service, session) -> None:
    user = await service.register("a@example.com", "secret123")
    await session.commit()
    assert user.is_verified is False
    assert len(service._email_sender.sent) == 1
    assert service._email_sender.sent[0]["to"] == "a@example.com"


async def test_register_duplicate_email_raises(service, session) -> None:
    await service.register("a@example.com", "secret123")
    await session.commit()
    with pytest.raises(EmailAlreadyRegisteredError):
        await service.register("a@example.com", "other")


async def test_login_before_verification_raises(service, session) -> None:
    await service.register("a@example.com", "secret123")
    await session.commit()
    with pytest.raises(EmailNotVerifiedError):
        await service.login("a@example.com", "secret123")


async def test_login_wrong_password_raises(service, session) -> None:
    await service.register("a@example.com", "secret123")
    await session.commit()
    with pytest.raises(InvalidCredentialsError):
        await service.login("a@example.com", "wrong")


async def test_verify_then_login_succeeds(service, session) -> None:
    await service.register("a@example.com", "secret123")
    await session.commit()
    sent_body = service._email_sender.sent[0]["body"]
    token = sent_body.split("token=")[1].split("\n")[0]

    await service.verify_email(token)
    await session.commit()

    access_token = await service.login("a@example.com", "secret123")
    assert decode_access_token(access_token) is not None