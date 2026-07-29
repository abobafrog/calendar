from collections.abc import Awaitable
from datetime import UTC, datetime
from typing import Any, cast

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.notification import Notification
from app.repositories.notifications import NotificationRepository


class NotificationService:
    def __init__(self, session: AsyncSession, redis: Redis | None = None) -> None:
        self.session = session
        self.redis = redis

    async def create(self, user_id: int, event_type: str, payload: dict[str, Any]) -> Notification:
        notification = Notification(user_id=user_id, type=event_type, payload=payload)
        self.session.add(notification)
        await self.session.flush()
        if self.redis is not None:
            await cast(Awaitable[int], self.redis.rpush("notifications:pending", str(notification.id)))
        return notification

    async def list_for_user(
        self,
        user_id: int,
        *,
        unread_only: bool,
        limit: int,
    ) -> list[Notification]:
        return await NotificationRepository(self.session).list_for_user(
            user_id,
            unread_only=unread_only,
            limit=limit,
        )

    async def mark_read(self, notification_id: int, user_id: int) -> Notification:
        notification = await NotificationRepository(self.session).get_owned(notification_id, user_id)
        if notification is None:
            raise AppError(404, "notification_not_found", "Уведомление не найдено")
        notification.read_at = notification.read_at or datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(notification)
        return notification

    async def mark_all_read(self, user_id: int) -> None:
        notifications = await NotificationRepository(self.session).list_unread_for_user(user_id)
        read_at = datetime.now(UTC)
        for notification in notifications:
            notification.read_at = read_at
        await self.session.commit()
