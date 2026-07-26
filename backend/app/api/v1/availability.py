from app.api.deps import get_redis
from app.core.config import Settings, get_settings
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.availability import AvailabilitySearchRequest, AvailabilitySearchResponse
from app.services.availability import AvailabilityService
from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/availability", tags=["availability"])


@router.post("/search", response_model=AvailabilitySearchResponse)
async def search_availability(
    payload: AvailabilitySearchRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    redis: Redis = Depends(get_redis),
) -> AvailabilitySearchResponse:
    await enforce_rate_limit(redis, f"rate:availability:{current_user.id}", RateLimit(60, 3600))
    return await AvailabilityService(session, settings).search(current_user, payload)
