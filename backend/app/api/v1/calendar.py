from datetime import UTC, datetime

from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.repositories.friendships import FriendshipRepository
from app.schemas.calendar import (
    BusyIntervalBulkCreate,
    BusyIntervalCreate,
    BusyIntervalResponse,
    BusyIntervalUpdate,
    FriendBusyInterval,
    UserCalendar,
)
from app.schemas.users import UserSummary
from app.services.calendar import CalendarService
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/calendar", tags=["calendar"])


def validate_range(start_at: datetime, end_at: datetime, settings: Settings) -> tuple[datetime, datetime]:
    if start_at.tzinfo is None or end_at.tzinfo is None or start_at >= end_at:
        raise AppError(422, "invalid_range", "A valid timezone-aware range is required")
    if (end_at - start_at).days > settings.max_calendar_range_days:
        raise AppError(422, "range_too_wide", "Calendar range is too wide")
    return start_at.astimezone(UTC), end_at.astimezone(UTC)


@router.get("/me", response_model=list[FriendBusyInterval])
async def my_calendar(
    start_at: datetime = Query(),
    end_at: datetime = Query(),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> list[FriendBusyInterval]:
    start_at, end_at = validate_range(start_at, end_at, settings)
    return await CalendarService(session).list_friend_calendar(current_user, current_user.id, start_at, end_at)


@router.post("/intervals", response_model=BusyIntervalResponse, status_code=status.HTTP_201_CREATED)
async def create_interval(
    payload: BusyIntervalCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BusyIntervalResponse:
    service = CalendarService(session)
    interval = await service.create(current_user, payload)
    await session.commit()
    return BusyIntervalResponse.model_validate(interval)


@router.post(
    "/intervals/bulk",
    response_model=list[BusyIntervalResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_intervals_bulk(
    payload: BusyIntervalBulkCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[BusyIntervalResponse]:
    intervals = await CalendarService(session).create_bulk(current_user, payload.intervals)
    return [BusyIntervalResponse.model_validate(item) for item in intervals]


@router.patch("/intervals/{interval_id}", response_model=BusyIntervalResponse)
async def update_interval(
    interval_id: int,
    payload: BusyIntervalUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> BusyIntervalResponse:
    interval = await CalendarService(session).update(current_user, interval_id, payload)
    return BusyIntervalResponse.model_validate(interval)


@router.delete("/intervals/{interval_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interval(
    interval_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    await CalendarService(session).delete(current_user, interval_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/friends", response_model=list[UserCalendar])
async def friends_calendars(
    start_at: datetime = Query(),
    end_at: datetime = Query(),
    user_ids: list[int] = Query(default=[]),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> list[UserCalendar]:
    start_at, end_at = validate_range(start_at, end_at, settings)
    friend_pairs = await FriendshipRepository(session).list_friends(current_user.id)
    friends = {user.id: user for _, user in friend_pairs}
    requested = set(user_ids or friends.keys())
    if not requested.issubset(friends.keys()):
        raise AppError(403, "calendar_access_denied", "All requested users must be friends")
    service = CalendarService(session)
    return [
        UserCalendar(
            user=UserSummary.model_validate(friends[user_id]),
            intervals=await service.list_friend_calendar(current_user, user_id, start_at, end_at),
        )
        for user_id in sorted(requested)
    ]


@router.get("/friends/{user_id}", response_model=list[FriendBusyInterval])
async def friend_calendar(
    user_id: int,
    start_at: datetime = Query(),
    end_at: datetime = Query(),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> list[FriendBusyInterval]:
    start_at, end_at = validate_range(start_at, end_at, settings)
    return await CalendarService(session).list_friend_calendar(current_user, user_id, start_at, end_at)
