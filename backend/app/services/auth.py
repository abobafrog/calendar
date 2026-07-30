from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import (
    create_access_token,
    hash_password,
    password_needs_rehash,
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

    async def authenticate(self, init_data: str) -> tuple[AuthResponse, str]:
        telegram_data = await verify_telegram_init_data(init_data, self.settings)
        try:
            user = await UserRepository(self.session).upsert_telegram(telegram_data.user)
            await self.session.commit()
            await self.session.refresh(user)
        except IntegrityError:
            await self.session.rollback()
            try:
                user = await UserRepository(self.session).upsert_telegram(
                    telegram_data.user.model_copy(update={"username": None})
                )
                await self.session.commit()
                await self.session.refresh(user)
            except Exception as retry_exc:
                await self.session.rollback()
                raise AppError(409, "telegram_auth_conflict", "Не удалось связать аккаунт Телеграма") from retry_exc
        except Exception:
            await self.session.rollback()
            raise
        token, expires_at = create_access_token(user.id, self.settings)
        return AuthResponse(expires_at=expires_at, user=UserResponse.model_validate(user)), token

    async def register(self, payload: RegisterRequest) -> tuple[AuthResponse, str]:
        repository = UserRepository(self.session)
        if await repository.get_by_username(payload.username):
            raise AppError(409, "username_already_registered", "Пользователь с таким логином уже существует")

        try:
            user = await repository.create_password_user(
                password_hash=hash_password(payload.password),
                first_name=payload.first_name,
                last_name=payload.last_name,
                username=payload.username,
                timezone=validate_timezone(payload.timezone),
            )
            await self.session.commit()
            await self.session.refresh(user)
        except IntegrityError as exc:
            await self.session.rollback()
            raise AppError(409, "username_already_registered", "Пользователь с таким логином уже существует") from exc
        except Exception:
            await self.session.rollback()
            raise
        token, expires_at = create_access_token(user.id, self.settings)
        return AuthResponse(expires_at=expires_at, user=UserResponse.model_validate(user)), token

    async def login(self, payload: LoginRequest) -> tuple[AuthResponse, str]:
        user = await UserRepository(self.session).get_by_username(payload.username)
        password_hash = user.password_hash if user is not None else DUMMY_PASSWORD_HASH
        if not verify_password(payload.password, password_hash) or user is None:
            raise AppError(401, "invalid_credentials", "Неверный логин или пароль")
        if password_needs_rehash(user.password_hash):
            user.password_hash = hash_password(payload.password)
            await self.session.commit()
            await self.session.refresh(user)
        token, expires_at = create_access_token(user.id, self.settings)
        return AuthResponse(expires_at=expires_at, user=UserResponse.model_validate(user)), token


DUMMY_PASSWORD_HASH = hash_password("dummy-password-used-only-for-constant-time-login")
