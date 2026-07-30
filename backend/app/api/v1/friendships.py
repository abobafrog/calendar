from app.api.deps import get_redis
from app.core.errors import AppError
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.friendship import Friendship
from app.models.user import User
from app.repositories.friendships import FriendshipRepository
from app.repositories.users import UserRepository
from app.schemas.friendships import (
    FriendAliasUpdate,
    FriendRequestCreate,
    FriendResponse,
    FriendshipResponse,
)
from app.schemas.users import UserSummary
from app.services.friendships import FriendshipService
from fastapi import APIRouter, Depends, Response, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["friends"])


def serialize_request(relation: Friendship, actor_id: int) -> FriendshipResponse:
    other = relation.addressee if relation.requester_id == actor_id else relation.requester
    return FriendshipResponse.model_validate(relation).model_copy(update={"user": UserSummary.model_validate(other)})


@router.get("/friend-invites/{invite_code}", response_model=UserSummary)
async def preview_friend_invite(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> UserSummary:
    await enforce_rate_limit(redis, f"rate:friend-preview:{current_user.id}", RateLimit(30, 3600))
    if len(invite_code) < 8 or len(invite_code) > 32:
        raise AppError(404, "invite_not_found", "Приглашение не найдено")
    inviter = await UserRepository(session).get_by_invite_code(invite_code)
    if inviter is None or inviter.id == current_user.id:
        raise AppError(404, "invite_not_found", "Приглашение не найдено")
    return UserSummary.model_validate(inviter)


@router.get("/friends", response_model=list[FriendResponse])
async def list_friends(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[FriendResponse]:
    pairs = await FriendshipRepository(session).list_friends(current_user.id)
    return [
        FriendResponse(
            **UserSummary.model_validate(user).model_dump(),
            friendship_id=relation.id,
            friends_since=relation.updated_at,
            alias=(relation.requester_alias if relation.requester_id == current_user.id else relation.addressee_alias),
        )
        for relation, user in pairs
    ]


@router.get("/friend-requests/incoming", response_model=list[FriendshipResponse])
async def incoming_requests(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[FriendshipResponse]:
    relations = await FriendshipRepository(session).list_requests(current_user.id, incoming=True)
    return [serialize_request(item, current_user.id) for item in relations]


@router.get("/friend-requests/outgoing", response_model=list[FriendshipResponse])
async def outgoing_requests(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[FriendshipResponse]:
    relations = await FriendshipRepository(session).list_requests(current_user.id, incoming=False)
    return [serialize_request(item, current_user.id) for item in relations]


@router.post("/friend-requests", response_model=FriendshipResponse, status_code=status.HTTP_201_CREATED)
async def create_friend_request(
    payload: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> FriendshipResponse:
    await enforce_rate_limit(redis, f"rate:friend-invite:{current_user.id}", RateLimit(10, 3600))
    relation = await FriendshipService(session, redis).create_request(current_user, payload)
    relation = (await FriendshipRepository(session).get_by_id(relation.id)) or relation
    return serialize_request(relation, current_user.id)


@router.post("/friend-requests/{friendship_id}/accept", response_model=FriendshipResponse)
async def accept_friend_request(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> FriendshipResponse:
    await enforce_rate_limit(redis, f"rate:friend-write:{current_user.id}", RateLimit(120, 3600))
    relation = await FriendshipService(session, redis).respond(current_user, friendship_id, True)
    return FriendshipResponse.model_validate(relation)


@router.post("/friend-requests/{friendship_id}/reject", response_model=FriendshipResponse)
async def reject_friend_request(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> FriendshipResponse:
    await enforce_rate_limit(redis, f"rate:friend-write:{current_user.id}", RateLimit(120, 3600))
    relation = await FriendshipService(session, redis).respond(current_user, friendship_id, False)
    return FriendshipResponse.model_validate(relation)


@router.delete("/friend-requests/{friendship_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_friend_request(
    friendship_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> Response:
    await enforce_rate_limit(redis, f"rate:friend-write:{current_user.id}", RateLimit(120, 3600))
    await FriendshipService(session).cancel_request(current_user, friendship_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/friends/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_friend(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> Response:
    await enforce_rate_limit(redis, f"rate:friend-write:{current_user.id}", RateLimit(120, 3600))
    await FriendshipService(session).remove_friend(current_user, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/friends/{user_id}/alias", response_model=FriendResponse)
async def rename_friend(
    user_id: int,
    payload: FriendAliasUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> FriendResponse:
    await enforce_rate_limit(redis, f"rate:friend-write:{current_user.id}", RateLimit(120, 3600))
    relation = await FriendshipService(session).set_alias(current_user, user_id, payload.alias)
    friend = await UserRepository(session).get_by_id(user_id)
    if friend is None:
        raise AppError(404, "friendship_not_found", "Друг не найден")
    return FriendResponse(
        **UserSummary.model_validate(friend).model_dump(),
        friendship_id=relation.id,
        friends_since=relation.updated_at,
        alias=(relation.requester_alias if relation.requester_id == current_user.id else relation.addressee_alias),
    )


@router.post("/users/{user_id}/block", response_model=FriendshipResponse)
async def block_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> Friendship:
    await enforce_rate_limit(redis, f"rate:friend-write:{current_user.id}", RateLimit(120, 3600))
    return await FriendshipService(session).block(current_user, user_id)
