from collections.abc import Awaitable
from typing import Any, cast

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


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
