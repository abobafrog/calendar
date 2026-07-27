from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_for_user(
        self,
        user_id: int,
        *,
        unread_only: bool,
        limit: int,
    ) -> list[Notification]:
        query: Select[tuple[Notification]] = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            query = query.where(Notification.read_at.is_(None))
        query = query.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit)
        return list(await self.session.scalars(query))

    async def get_owned(self, notification_id: int, user_id: int) -> Notification | None:
        result = await self.session.scalars(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return result.first()

    async def list_unread_for_user(self, user_id: int) -> list[Notification]:
        return list(
            await self.session.scalars(
                select(Notification).where(
                    Notification.user_id == user_id,
                    Notification.read_at.is_(None),
                )
            )
        )
