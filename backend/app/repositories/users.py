import secrets

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.telegram_auth import TelegramUserData
from app.models.enums import FriendshipStatus
from app.models.friendship import Friendship
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

    async def search_by_username_prefix(self, query: str, *, exclude_user_id: int, limit: int = 6) -> list[User]:
        normalized = query.removeprefix("@").strip().lower()
        if not normalized:
            return []
        active_relationship = (
            select(Friendship.id)
            .where(
                Friendship.status.in_(
                    [
                        FriendshipStatus.PENDING,
                        FriendshipStatus.ACCEPTED,
                        FriendshipStatus.BLOCKED,
                    ]
                ),
                or_(
                    (Friendship.requester_id == exclude_user_id) & (Friendship.addressee_id == User.id),
                    (Friendship.requester_id == User.id) & (Friendship.addressee_id == exclude_user_id),
                ),
            )
            .exists()
        )
        result = await self.session.scalars(
            select(User)
            .where(
                User.id != exclude_user_id,
                User.username.is_not(None),
                func.lower(User.username).startswith(normalized),
                ~active_relationship,
            )
            .order_by(func.length(User.username), func.lower(User.username))
            .limit(limit)
        )
        return list(result)

    async def get_by_invite_code(self, invite_code: str) -> User | None:
        result = await self.session.scalars(select(User).where(User.invite_code == invite_code))
        return result.first()

    async def is_username_taken(self, username: str, *, exclude_user_id: int | None = None) -> bool:
        normalized = username.removeprefix("@").lower()
        query = select(User.id).where(func.lower(User.username) == normalized)
        if exclude_user_id is not None:
            query = query.where(User.id != exclude_user_id)
        return await self.session.scalar(query) is not None

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

    async def create_password_user(
        self,
        *,
        password_hash: str,
        first_name: str,
        last_name: str | None,
        username: str,
        timezone: str,
    ) -> User:
        user = User(
            password_hash=password_hash,
            username=username.removeprefix("@").lower(),
            first_name=first_name.strip(),
            last_name=last_name.strip() if last_name else None,
            timezone=timezone,
            invite_code=secrets.token_urlsafe(12),
        )
        self.session.add(user)
        await self.session.flush()
        return user
