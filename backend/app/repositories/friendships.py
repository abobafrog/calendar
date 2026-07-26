from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.elements import ColumnElement

from app.models.enums import FriendshipStatus
from app.models.friendship import Friendship
from app.models.user import User


def pair_condition(left_id: int, right_id: int) -> ColumnElement[bool]:
    return or_(
        and_(Friendship.requester_id == left_id, Friendship.addressee_id == right_id),
        and_(Friendship.requester_id == right_id, Friendship.addressee_id == left_id),
    )


class FriendshipRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def lock_users(self, user_ids: list[int]) -> None:
        await self.session.execute(
            select(User.id).where(User.id.in_(sorted(user_ids))).order_by(User.id).with_for_update()
        )

    async def get_pair(self, left_id: int, right_id: int, for_update: bool = False) -> Friendship | None:
        query = select(Friendship).where(pair_condition(left_id, right_id))
        if for_update:
            query = query.with_for_update()
        result = await self.session.scalars(query)
        return result.first()

    async def get_by_id(self, friendship_id: int, for_update: bool = False) -> Friendship | None:
        query = (
            select(Friendship)
            .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
            .where(Friendship.id == friendship_id)
        )
        if for_update:
            query = query.with_for_update()
        result = await self.session.scalars(query)
        return result.first()

    async def is_friend(self, left_id: int, right_id: int) -> bool:
        relation_id = await self.session.scalar(
            select(Friendship.id).where(
                pair_condition(left_id, right_id), Friendship.status == FriendshipStatus.ACCEPTED
            )
        )
        return relation_id is not None

    async def list_friends(self, user_id: int) -> list[tuple[Friendship, User]]:
        relations = list(
            await self.session.scalars(
                select(Friendship)
                .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
                .where(
                    or_(Friendship.requester_id == user_id, Friendship.addressee_id == user_id),
                    Friendship.status == FriendshipStatus.ACCEPTED,
                )
                .order_by(Friendship.updated_at.desc())
            )
        )
        return [
            (relation, relation.addressee if relation.requester_id == user_id else relation.requester)
            for relation in relations
        ]

    async def list_requests(self, user_id: int, incoming: bool) -> list[Friendship]:
        side = Friendship.addressee_id if incoming else Friendship.requester_id
        result = await self.session.scalars(
            select(Friendship)
            .options(selectinload(Friendship.requester), selectinload(Friendship.addressee))
            .where(side == user_id, Friendship.status == FriendshipStatus.PENDING)
            .order_by(Friendship.created_at.desc())
        )
        return list(result)
