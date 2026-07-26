import asyncio
from collections.abc import Awaitable
from typing import cast

import structlog
from aiogram import Bot
from aiogram.exceptions import TelegramBadRequest, TelegramForbiddenError
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.bot.keyboards import meeting_keyboard, open_app_keyboard
from app.core.config import Settings
from app.db.session import SessionFactory
from app.models.notification import Notification

logger = structlog.get_logger()

SAFE_TEXT = {
    "friend_request_created": "Новое приглашение в друзья.",
    "friend_request_accepted": "Приглашение в друзья принято.",
    "friend_request_rejected": "Приглашение в друзья отклонено.",
    "meeting_proposed": "Вам предложили новую встречу. Откройте приложение, чтобы увидеть детали.",
    "meeting_confirmed": "Встреча подтверждена всеми участниками.",
    "meeting_declined": "Один из участников отклонил встречу.",
    "meeting_cancelled": "Встреча отменена организатором.",
}


async def notification_worker(bot: Bot, redis: Redis, settings: Settings) -> None:
    while True:
        item = await cast(
            Awaitable[tuple[str, str] | None],
            redis.blpop(["notifications:pending"], timeout=5),
        )
        if item is None:
            await asyncio.sleep(0)
            continue
        notification_id = int(item[1])
        async with SessionFactory() as session:
            notification = await session.scalar(
                select(Notification).options(selectinload(Notification.user)).where(Notification.id == notification_id)
            )
            if (
                notification is None
                or not notification.user.notifications_enabled
                or notification.user.telegram_id is None
            ):
                continue
            meeting_id = notification.payload.get("meeting_id")
            keyboard = (
                meeting_keyboard(int(meeting_id), settings.mini_app_url)
                if notification.type == "meeting_proposed" and meeting_id
                else open_app_keyboard(settings.mini_app_url)
            )
            try:
                await bot.send_message(
                    notification.user.telegram_id,
                    SAFE_TEXT.get(notification.type, "Есть новое уведомление."),
                    reply_markup=keyboard,
                )
            except (TelegramForbiddenError, TelegramBadRequest):
                logger.info(
                    "telegram_notification_not_delivered",
                    notification_id=notification.id,
                    notification_type=notification.type,
                )
            except Exception:
                await cast(Awaitable[int], redis.rpush("notifications:pending", str(notification.id)))
                logger.exception("telegram_notification_retry", notification_id=notification.id)
                await asyncio.sleep(2)
