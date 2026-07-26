from fastapi import status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.enums import FriendshipStatus
from app.models.friendship import Friendship
from app.models.user import User
from app.repositories.friendships import FriendshipRepository
from app.repositories.users import UserRepository
from app.schemas.friendships import FriendRequestCreate
from app.services.notifications import NotificationService


class FriendshipService:
    def __init__(self, session: AsyncSession, redis: Redis | None = None) -> None:
        self.session = session
        self.repository = FriendshipRepository(session)
        self.users = UserRepository(session)
        self.notifications = NotificationService(session, redis)

    async def create_request(self, actor: User, data: FriendRequestCreate) -> Friendship:
        target = (
            await self.users.get_by_username(data.username)
            if data.username
            else await self.users.get_by_invite_code(data.invite_code or "")
        )
        if target is None:
            raise AppError(404, "user_not_found", "No user matches that exact identifier")
        if target.id == actor.id:
            raise AppError(422, "self_friendship", "You cannot invite yourself")

        await self.repository.lock_users([actor.id, target.id])
        relation = await self.repository.get_pair(actor.id, target.id, for_update=True)
        if relation is not None:
            if relation.status == FriendshipStatus.BLOCKED:
                raise AppError(403, "friendship_blocked", "A blocked relationship cannot be invited")
            if relation.status == FriendshipStatus.ACCEPTED:
                raise AppError(409, "already_friends", "You are already friends")
            if relation.status == FriendshipStatus.PENDING:
                if relation.requester_id == target.id:
                    relation.status = FriendshipStatus.ACCEPTED
                    await self.notifications.create(
                        target.id, "friend_request_accepted", {"friendship_id": relation.id}
                    )
                    await self.session.commit()
                    return relation
                raise AppError(409, "friend_request_exists", "A friend request already exists")
            relation.requester_id = actor.id
            relation.addressee_id = target.id
            relation.status = FriendshipStatus.PENDING
            relation.blocked_by_id = None
        else:
            relation = Friendship(requester_id=actor.id, addressee_id=target.id)
            self.session.add(relation)
        await self.session.flush()
        await self.notifications.create(target.id, "friend_request_created", {"friendship_id": relation.id})
        await self.session.commit()
        return relation

    async def respond(self, actor: User, friendship_id: int, accept: bool) -> Friendship:
        relation = await self.repository.get_by_id(friendship_id, for_update=True)
        if relation is None or relation.addressee_id != actor.id:
            raise AppError(404, "friend_request_not_found", "Friend request not found")
        if relation.status != FriendshipStatus.PENDING:
            raise AppError(409, "friend_request_resolved", "Friend request is already resolved")
        relation.status = FriendshipStatus.ACCEPTED if accept else FriendshipStatus.REJECTED
        await self.notifications.create(
            relation.requester_id,
            "friend_request_accepted" if accept else "friend_request_rejected",
            {"friendship_id": relation.id},
        )
        await self.session.commit()
        return relation

    async def remove_friend(self, actor: User, friend_id: int) -> None:
        relation = await self.repository.get_pair(actor.id, friend_id, for_update=True)
        if relation is None or relation.status != FriendshipStatus.ACCEPTED:
            raise AppError(404, "friendship_not_found", "Friendship not found")
        await self.session.delete(relation)
        await self.session.commit()

    async def block(self, actor: User, target_id: int) -> Friendship:
        if target_id == actor.id:
            raise AppError(status.HTTP_422_UNPROCESSABLE_ENTITY, "self_block", "You cannot block yourself")
        if await self.users.get_by_id(target_id) is None:
            raise AppError(404, "user_not_found", "User not found")
        await self.repository.lock_users([actor.id, target_id])
        relation = await self.repository.get_pair(actor.id, target_id, for_update=True)
        if relation is None:
            relation = Friendship(
                requester_id=actor.id,
                addressee_id=target_id,
                status=FriendshipStatus.BLOCKED,
                blocked_by_id=actor.id,
            )
            self.session.add(relation)
        else:
            relation.status = FriendshipStatus.BLOCKED
            relation.blocked_by_id = actor.id
        await self.session.commit()
        return relation
