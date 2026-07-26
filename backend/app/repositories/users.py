import secrets

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.telegram_auth import TelegramUserData
from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_telegram_id(self, telegram_id: int) -> User | None:
        result = await self.session.scalars(select(User).where(User.telegram_id == telegram_id))
        return result.first()

    async def get_by_username(self, username: str) -> User | None:
        normalized = username.removeprefix("@").lower()
        result = await self.session.scalars(select(User).where(func.lower(User.username) == normalized))
        return result.first()

    async def get_by_invite_code(self, invite_code: str) -> User | None:
        result = await self.session.scalars(select(User).where(User.invite_code == invite_code))
        return result.first()

    async def get_many(self, user_ids: list[int]) -> list[User]:
        result = await self.session.scalars(select(User).where(User.id.in_(user_ids)))
        return list(result)

    async def upsert_telegram(self, data: TelegramUserData) -> User:
        user = await self.get_by_telegram_id(data.id)
        if user is None:
            user = User(
                telegram_id=data.id,
                username=data.username,
                first_name=data.first_name,
                last_name=data.last_name,
                photo_url=data.photo_url,
                invite_code=secrets.token_urlsafe(12),
            )
            self.session.add(user)
        else:
            user.username = data.username
            user.first_name = data.first_name
            user.last_name = data.last_name
            user.photo_url = data.photo_url
        await self.session.flush()
        return user
