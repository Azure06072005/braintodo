from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from braintodo.auth.email_sender import EmailSender, SMTPEmailSender
from braintodo.auth.schemas import LoginRequest, RegisterRequest, TokenResponse, UserOut
from braintodo.auth.security import decode_access_token
from braintodo.auth.service import (
    AuthService,
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidOrExpiredTokenError,
)
from braintodo.config import settings
from braintodo.db.base import get_session
from braintodo.db.models import User
from braintodo.db.repository import TokenRepository, UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_email_sender() -> EmailSender:
    """Real production email sender. Tests override qua
    app.dependency_overrides[get_email_sender] bằng FakeEmailSender."""
    return SMTPEmailSender(
        host=settings.smtp_host,
        port=settings.smtp_port,
        user=settings.smtp_user,
        password=settings.smtp_password,
        from_addr=settings.smtp_from,
    )


def get_auth_service(
    session: AsyncSession = Depends(get_session),
    email_sender: EmailSender = Depends(get_email_sender),
) -> AuthService:
    return AuthService(UserRepository(session), TokenRepository(session), email_sender)


async def get_current_user(
    token: str | None = Depends(_oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    if token is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = await UserRepository(session).get_by_id(user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


@router.post("/register", response_model=UserOut, status_code=201)
async def register(
    data: RegisterRequest,
    session: AsyncSession = Depends(get_session),
    service: AuthService = Depends(get_auth_service),
) -> User:
    try:
        user = await service.register(data.email, data.password)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered") from exc
    await session.commit()
    return user


@router.get("/verify", response_model=UserOut)
async def verify(
    token: str,
    session: AsyncSession = Depends(get_session),
    service: AuthService = Depends(get_auth_service),
) -> User:
    try:
        user = await service.verify_email(token)
    except InvalidOrExpiredTokenError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token") from exc
    await session.commit()
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    session: AsyncSession = Depends(get_session),
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        access_token = await service.login(data.email, data.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password") from exc
    except EmailNotVerifiedError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified") from exc
    await session.commit()
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user