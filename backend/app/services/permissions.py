from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.busy_interval import BusyInterval
from app.models.meeting import MeetingProposal
from app.models.user import User
from app.repositories.friendships import FriendshipRepository


class PermissionService:
    def __init__(self, session: AsyncSession) -> None:
        self.friendships = FriendshipRepository(session)

    async def require_calendar_access(self, actor_id: int, owner_id: int) -> None:
        if actor_id == owner_id:
            return
        if not await self.friendships.is_friend(actor_id, owner_id):
            raise AppError(403, "calendar_access_denied", "Календарь доступен только друнам")

    @staticmethod
    def require_interval_owner(actor: User, interval: BusyInterval) -> None:
        if interval.user_id != actor.id:
            raise AppError(404, "interval_not_found", "Дело в календаре не найдено")

    @staticmethod
    def require_meeting_creator(actor: User, meeting: MeetingProposal) -> None:
        if meeting.creator_id != actor.id:
            raise AppError(403, "meeting_owner_required", "Это действие доступно только организатору встречи")
