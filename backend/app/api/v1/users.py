from app.api.deps import get_redis
from app.core.errors import AppError
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.repositories.users import UserRepository
from app.schemas.users import UserResponse, UserSummary, UserUpdate
from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/lookup", response_model=UserSummary)
async def lookup_user(
    username: str = Query(min_length=3, max_length=64),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> UserSummary:
    await enforce_rate_limit(redis, f"rate:user-lookup:{current_user.id}", RateLimit(30, 3600))
    user = await UserRepository(session).get_by_username(username)

    if user is None or user.id == current_user.id:
        raise AppError(404, "user_not_found", "Пользователь с таким логином не найден")
    return UserSummary.model_validate(user)


@router.get("/search", response_model=list[UserSummary])
async def search_users(
    query: str = Query(min_length=1, max_length=64),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> list[UserSummary]:
    await enforce_rate_limit(redis, f"rate:user-search:{current_user.id}", RateLimit(120, 3600))
    users = await UserRepository(session).search_by_username_prefix(query, exclude_user_id=current_user.id)
    return [UserSummary.model_validate(user) for user in users]


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> User:
    await enforce_rate_limit(redis, f"rate:user-update:{current_user.id}", RateLimit(30, 3600))
    allowed_fields = {
        "first_name",
        "last_name",
        "username",
        "timezone",
        "week_starts_on",
        "time_format",
        "workday_start",
        "workday_end",
        "sleep_start",
        "sleep_end",
        "minimum_break_minutes",
        "undesirable_weekdays",
        "default_visibility",
        "share_details_with_friends",
        "details_access_until",
        "notifications_enabled",
        "holiday_categories",
    }
    repository = UserRepository(session)
    if "username" in payload.model_fields_set and payload.username is None:
        raise AppError(422, "invalid_username", "Логин не может быть пустым")
    if payload.username is not None and await repository.is_username_taken(
        payload.username, exclude_user_id=current_user.id
    ):
        raise AppError(409, "username_already_taken", "Этот логин уже занят")
    if "holiday_categories" in payload.model_fields_set and payload.holiday_categories is None:
        raise AppError(422, "invalid_holiday_categories", "Нужно передать список категорий праздников")
    if "undesirable_weekdays" in payload.model_fields_set and payload.undesirable_weekdays is None:
        raise AppError(422, "invalid_undesirable_weekdays", "Нужно передать список нежелательных дней")
    for field_name in payload.model_fields_set & allowed_fields:
        value = getattr(payload, field_name)
        if field_name == "username" and isinstance(value, str):
            value = value.removeprefix("@").lower()
        if field_name == "first_name" and isinstance(value, str):
            value = value.strip()
            if not value:
                raise AppError(422, "invalid_first_name", "Имя не может быть пустым")
        if field_name == "last_name" and isinstance(value, str):
            value = value.strip() or None
        if field_name == "timezone" and isinstance(value, str):
            from app.schemas.common import validate_timezone

            value = validate_timezone(value)
        setattr(current_user, field_name, value)
    if current_user.workday_start >= current_user.workday_end:
        raise AppError(422, "invalid_workday", "Начало рабочего времени должно быть раньше конца")
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise AppError(409, "username_already_taken", "Этот логин уже занят") from exc
    await session.refresh(current_user)
    return current_user
