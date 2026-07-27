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
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/lookup", response_model=UserSummary)
async def lookup_user(
    username: str = Query(min_length=1, max_length=32),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> UserSummary:
    await enforce_rate_limit(redis, f"rate:user-lookup:{current_user.id}", RateLimit(30, 3600))
    user = await UserRepository(session).get_by_username(username)

    if user is None or user.id == current_user.id:
        raise AppError(404, "user_not_found", "No user matches that exact username")
    return UserSummary.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    allowed_fields = {
        "first_name",
        "last_name",
        "username",
        "photo_url",
        "timezone",
        "week_starts_on",
        "time_format",
        "workday_start",
        "workday_end",
        "notifications_enabled",
    }
    repository = UserRepository(session)
    if "username" in payload.model_fields_set and payload.username is None:
        raise AppError(422, "invalid_username", "Username cannot be empty")
    if payload.username is not None and await repository.is_username_taken(
        payload.username, exclude_user_id=current_user.id
    ):
        raise AppError(409, "username_already_taken", "This username is already taken")
    for field_name in payload.model_fields_set & allowed_fields:
        value = getattr(payload, field_name)
        if field_name == "username" and isinstance(value, str):
            value = value.removeprefix("@").lower()
        if field_name == "first_name" and isinstance(value, str):
            value = value.strip()
            if not value:
                raise AppError(422, "invalid_first_name", "First name cannot be empty")
        if field_name == "last_name" and isinstance(value, str):
            value = value.strip() or None
        if field_name == "photo_url" and isinstance(value, str):
            value = value.strip() or None
        if field_name == "timezone" and isinstance(value, str):
            from app.schemas.common import validate_timezone

            value = validate_timezone(value)
        setattr(current_user, field_name, value)
    if current_user.workday_start >= current_user.workday_end:
        raise AppError(422, "invalid_workday", "Workday start must be before workday end")
    await session.commit()
    await session.refresh(current_user)
    return current_user
