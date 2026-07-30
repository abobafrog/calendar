from datetime import UTC, datetime

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.busy_interval import BusyInterval
from app.models.enums import (
    IntervalVisibility,
    MeetingStatus,
    ParticipantResponse,
)
from app.models.meeting import MeetingParticipant, MeetingProposal
from app.models.user import User
from app.repositories.calendar import CalendarRepository
from app.repositories.friendships import FriendshipRepository
from app.repositories.meetings import MeetingRepository
from app.repositories.users import UserRepository
from app.schemas.meetings import MeetingCreate
from app.services.notifications import NotificationService
from app.services.permissions import PermissionService


class MeetingService:
    def __init__(self, session: AsyncSession, redis: Redis | None = None) -> None:
        self.session = session
        self.meetings = MeetingRepository(session)
        self.calendar = CalendarRepository(session)
        self.friendships = FriendshipRepository(session)
        self.users = UserRepository(session)
        self.notifications = NotificationService(session, redis)

    async def create(self, actor: User, data: MeetingCreate) -> MeetingProposal:
        participant_ids = sorted(set(data.participant_ids) | {actor.id})
        users = await self.users.get_many(participant_ids)
        if len(users) != len(participant_ids):
            raise AppError(404, "participant_not_found", "Один или несколько участников не найдены")
        for participant_id in participant_ids:
            if participant_id != actor.id and not await self.friendships.is_friend(actor.id, participant_id):
                raise AppError(403, "participant_not_friend", "Участниками встречи могут быть только друны")

        meeting = MeetingProposal(
            creator_id=actor.id,
            title=data.title,
            description=data.description,
            location=data.location,
            meeting_url=data.meeting_url,
            reminder_minutes=data.reminder_minutes,
            start_at=data.start_at,
            end_at=data.end_at,
            participants=[
                MeetingParticipant(
                    user_id=user_id,
                    response=(ParticipantResponse.ACCEPTED if user_id == actor.id else ParticipantResponse.PENDING),
                    responded_at=datetime.now(UTC) if user_id == actor.id else None,
                )
                for user_id in participant_ids
            ],
        )
        self.session.add(meeting)
        await self.session.flush()
        for participant_id in participant_ids:
            if participant_id != actor.id:
                await self.notifications.create(participant_id, "meeting_proposed", {"meeting_id": meeting.id})
        await self.session.commit()
        return (await self.meetings.get_for_user(meeting.id, actor.id)) or meeting

    async def respond(self, actor: User, meeting_id: int, response: ParticipantResponse) -> MeetingProposal:
        meeting = await self.meetings.get_for_user(meeting_id, actor.id, for_update=True)
        if meeting is None:
            raise AppError(404, "meeting_not_found", "Встреча не найдена")
        if meeting.status != MeetingStatus.PENDING:
            raise AppError(409, "meeting_not_pending", "Эта встреча больше не ожидает ответа")
        participant = await self.meetings.get_participant(meeting_id, actor.id, for_update=True)
        if participant is None:
            raise AppError(404, "meeting_not_found", "Встреча не найдена")

        if response == ParticipantResponse.ACCEPTED and await self.calendar.has_conflict(
            actor.id, meeting.start_at, meeting.end_at, meeting.id
        ):
            raise AppError(
                409,
                "meeting_conflict",
                "В вашем календаре появилось пересечение с этой встречей",
            )
        participant.response = response
        participant.responded_at = datetime.now(UTC)
        if response == ParticipantResponse.DECLINED:
            await self.notifications.create(meeting.creator_id, "meeting_declined", {"meeting_id": meeting.id})
        elif all(
            item.response == ParticipantResponse.ACCEPTED for item in meeting.participants if item.user_id != actor.id
        ):
            await self._confirm(meeting)
        await self.session.commit()
        return (await self.meetings.get_for_user(meeting.id, actor.id)) or meeting

    async def _confirm(self, meeting: MeetingProposal) -> None:
        participant_ids = sorted(item.user_id for item in meeting.participants)
        await self.session.execute(
            select(User.id).where(User.id.in_(participant_ids)).order_by(User.id).with_for_update()
        )
        conflicts = [
            user_id
            for user_id in participant_ids
            if await self.calendar.has_conflict(user_id, meeting.start_at, meeting.end_at, meeting.id)
        ]
        if conflicts:
            raise AppError(
                409,
                "meeting_conflict",
                "Встречу нельзя подтвердить: один из участников теперь занят",
                {"participant_ids": conflicts},
            )
        meeting.status = MeetingStatus.CONFIRMED
        for user_id in participant_ids:
            self.session.add(
                BusyInterval(
                    user_id=user_id,
                    meeting_id=meeting.id,
                    start_at=meeting.start_at,
                    end_at=meeting.end_at,
                    title=meeting.title,
                    visibility=IntervalVisibility.OPEN,
                )
            )
            await self.notifications.create(user_id, "meeting_confirmed", {"meeting_id": meeting.id})

    async def cancel(self, actor: User, meeting_id: int) -> MeetingProposal:
        meeting = await self.meetings.get_for_user(meeting_id, actor.id, for_update=True)
        if meeting is None:
            raise AppError(404, "meeting_not_found", "Встреча не найдена")
        PermissionService.require_meeting_creator(actor, meeting)
        if meeting.status == MeetingStatus.CANCELLED:
            raise AppError(409, "meeting_cancelled", "Встреча уже отменена")
        meeting.status = MeetingStatus.CANCELLED
        await self.calendar.delete_for_meeting(meeting.id)
        for participant in meeting.participants:
            await self.notifications.create(participant.user_id, "meeting_cancelled", {"meeting_id": meeting.id})
        await self.session.commit()
        return (await self.meetings.get_for_user(meeting.id, actor.id)) or meeting
