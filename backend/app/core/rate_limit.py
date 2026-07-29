from dataclasses import dataclass

from app.core.errors import AppError
from redis.asyncio import Redis


@dataclass(frozen=True, slots=True)
class RateLimit:
    limit: int
    window_seconds: int


async def enforce_rate_limit(redis: Redis, key: str, rule: RateLimit) -> None:
    pipe = redis.pipeline()
    pipe.incr(key)
    pipe.expire(key, rule.window_seconds, nx=True)
    count, _expiry_set = await pipe.execute()
    if count > rule.limit:
        raise AppError(429, "rate_limit_exceeded", "Слишком много запросов. Попробуйте позже")
