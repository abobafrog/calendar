import asyncio

from aiogram import Bot, Dispatcher
from redis.asyncio import Redis

from app.bot.handlers import router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.tasks.notifications import notification_worker


async def main() -> None:
    settings = get_settings()
    if settings.bot_token is None:
        raise RuntimeError("BOT_TOKEN is required to run the legacy Telegram bot")
    configure_logging(settings.log_level)
    bot = Bot(settings.bot_token)
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    dispatcher = Dispatcher(settings=settings)
    dispatcher.include_router(router)
    worker = asyncio.create_task(notification_worker(bot, redis, settings))
    try:
        await dispatcher.start_polling(bot, allowed_updates=dispatcher.resolve_used_update_types())
    finally:
        worker.cancel()
        await redis.aclose()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
