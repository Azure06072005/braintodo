from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from braintodo.config import settings

class Base(DeclarativeBase): 

# echo = False
_engine = create_async_engine(settings.database_url, echo=False)
_session_factory = async_sessionmaker(_engine, expire_on_commit=False)

async def get_session() -> AsyncGenerator[AsyncSession, None]: 
    async with _session_factory() as session: 
        yield session

async def close_engine() -> None: 
    await _engine.dispose()

