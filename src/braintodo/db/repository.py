import uuid
from datetime import UTC

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from braintodo.db.models import EmailVerificationToken, User


class UserRepository: 
    def __init__(self, session: AsyncSession) -> None: 
        self._session = session

    async def create(self, email: str, hashed_password: str) -> User: 
        user = User(email=email, hashed_password=hashed_password)
        self._session.add(user)
        await self._session.flush()
        return user

    async def get_by_id(self, user_id: uuid.UUID) -> User | None: 
        return await self._session.get(User, user_id)
    
    async def get_by_email(self, email: str) -> User | None: 
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def mark_verified(self, user: User) -> None: 
        user.is_verified = True 
        await self._session.flush()

class TokenRepository: 
    def __init__(self, session: AsyncSession) -> None: 
        self._session = session
    
    async def create(self, user_id: uuid.UUID) -> EmailVerificationToken: 
        import secrets

        token = EmailVerificationToken(
            token=secrets.token_urlsafe(32), 
            user_id=user_id,
            expires_at=EmailVerificationToken.default_expiry(),
        )
        self._session.add(token)
        await self._session.flush()
        return token

    async def get_valid(self, token: str) -> EmailVerificationToken | None: 
        from datetime import datetime

        result = await self._session.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.token == token)
        )
        record = result.scalar_one_or_none()
        if record is None or record.expires_at < datetime.now(UTC): 
            return None
        return record

    async def delete(self, token_record: EmailVerificationToken) -> None: 
        await self._session.delete(token_record) 
        await self._session.flush()