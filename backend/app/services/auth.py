from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.security import create_access_token
from app.core.telegram_auth import verify_telegram_init_data
from app.repositories.users import UserRepository
from app.schemas.auth import AuthResponse
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
