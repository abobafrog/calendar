from app.api.deps import get_redis
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.notifications import NotificationResponse
from app.services.notifications import NotificationService
from fastapi import APIRouter, Depends, Query, Response, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    unread_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[NotificationResponse]:
    items = await NotificationService(session).list_for_user(
        current_user.id,
        unread_only=unread_only,
        limit=limit,
    )
    return [NotificationResponse.model_validate(item) for item in items]


@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all_notifications(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> Response:
    await enforce_rate_limit(redis, f"rate:notification-write:{current_user.id}", RateLimit(120, 3600))
    await NotificationService(session).mark_all_read(current_user.id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{notification_id}/read", response_model=NotificationResponse)
async def read_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> NotificationResponse:
    await enforce_rate_limit(redis, f"rate:notification-write:{current_user.id}", RateLimit(120, 3600))
    item = await NotificationService(session).mark_read(notification_id, current_user.id)
    return NotificationResponse.model_validate(item)
