from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.core.telegram_auth import verify_telegram_init_data
from app.repositories.users import UserRepository
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.common import validate_timezone
from app.schemas.users import UserResponse


class AuthService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings

    async def authenticate(self, init_data: str) -> AuthResponse:
        telegram_data = await verify_telegram_init_data(init_data, self.settings)
        try:
            user = await UserRepository(self.session).upsert_telegram(telegram_data.user)
            await self.session.commit()
            await self.session.refresh(user)
        except Exception:
            await self.session.rollback()
            raise
        token, expires_at = create_access_token(user.id, self.settings)
        return AuthResponse(
            access_token=token,
            expires_at=expires_at,
            user=UserResponse.model_validate(user),
        )

    async def register(self, payload: RegisterRequest) -> AuthResponse:
        repository = UserRepository(self.session)
        if await repository.get_by_email(payload.email):
            raise AppError(409, "email_already_registered", "User with this email already exists")
        if payload.username and await repository.get_by_username(payload.username):
            raise AppError(409, "username_already_registered", "User with this username already exists")

        try:
            user = await repository.create_password_user(
                email=payload.email,
                password_hash=hash_password(payload.password),
                first_name=payload.first_name,
                last_name=payload.last_name,
                username=payload.username,
                timezone=validate_timezone(payload.timezone),
            )
            await self.session.commit()
            await self.session.refresh(user)
        except Exception:
            await self.session.rollback()
            raise
        token, expires_at = create_access_token(user.id, self.settings)
        return AuthResponse(access_token=token, expires_at=expires_at, user=UserResponse.model_validate(user))

    async def login(self, payload: LoginRequest) -> AuthResponse:
        user = await UserRepository(self.session).get_by_email(payload.email)
        if user is None or not verify_password(payload.password, user.password_hash):
            raise AppError(401, "invalid_credentials", "Email or password is incorrect")
        token, expires_at = create_access_token(user.id, self.settings)
        return AuthResponse(access_token=token, expires_at=expires_at, user=UserResponse.model_validate(user))
