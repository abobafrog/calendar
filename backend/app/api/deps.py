from collections.abc import AsyncIterator

from fastapi import Request
from redis.asyncio import Redis


async def get_redis(request: Request) -> AsyncIterator[Redis]:
    yield request.app.state.redis
