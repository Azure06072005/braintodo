from uuid import UUID

from braintodo.auth.email_sender import EmailSender
from braintodo.auth.security import create_access_token, hash_password, verify_password
from braintodo.config import settings
from braintodo.db.models import User
from braintodo.db.repository import TokenRepository, UserRepository


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class EmailNotVerifiedError(Exception):
    pass


class InvalidOrExpiredTokenError(Exception):
    pass


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        tokens: TokenRepository,
        email_sender: EmailSender,
    ) -> None:
        self._users = users
        self._tokens = tokens
        self._email_sender = email_sender

    async def register(self, email: str, password: str) -> User:
        if await self._users.get_by_email(email) is not None:
            raise EmailAlreadyRegisteredError(email)

        user = await self._users.create(email=email, hashed_password=hash_password(password))
        token = await self._tokens.create(user.id)

        verify_link = f"{settings.frontend_base_url}/verify?token={token.token}"
        await self._email_sender.send(
            to=email,
            subject="Xác thực tài khoản braintodo",
            body=f"Nhấn vào link sau để xác thực tài khoản: {verify_link}\n"
            "Link hết hạn sau 24 giờ.",
        )
        return user

    async def verify_email(self, token: str) -> User:
        record = await self._tokens.get_valid(token)
        if record is None:
            raise InvalidOrExpiredTokenError(token)

        user = await self._users.get_by_id(record.user_id)
        assert user is not None  # user_id trong token luôn trỏ tới user có thật
        await self._users.mark_verified(user)
        await self._tokens.delete(record)
        return user

    async def login(self, email: str, password: str) -> str:
        user = await self._users.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsError(email)
        if not user.is_verified:
            raise EmailNotVerifiedError(email)
        return create_access_token(user.id)

    async def get_current_user(self, user_id: UUID) -> User | None:
        return await self._users.get_by_id(user_id)