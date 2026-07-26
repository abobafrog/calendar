from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql.base import ExecutableOption

from app.models.meeting import MeetingParticipant, MeetingProposal


class MeetingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _with_relations() -> ExecutableOption:
        return selectinload(MeetingProposal.participants).selectinload(MeetingParticipant.user)

    async def get_for_user(self, meeting_id: int, user_id: int, for_update: bool = False) -> MeetingProposal | None:
        query = (
            select(MeetingProposal)
            .options(self._with_relations())
            .join(MeetingParticipant)
            .where(MeetingProposal.id == meeting_id, MeetingParticipant.user_id == user_id)
        )
        if for_update:
            query = query.with_for_update(of=MeetingProposal)
        result = await self.session.scalars(query)
        return result.first()

    async def list_for_user(self, user_id: int) -> list[MeetingProposal]:
        result = await self.session.scalars(
            select(MeetingProposal)
            .options(self._with_relations())
            .join(MeetingParticipant)
            .where(MeetingParticipant.user_id == user_id)
            .order_by(MeetingProposal.start_at.desc())
        )
        return list(result.unique())

    async def get_participant(
        self, meeting_id: int, user_id: int, for_update: bool = False
    ) -> MeetingParticipant | None:
        query = select(MeetingParticipant).where(
            MeetingParticipant.meeting_id == meeting_id, MeetingParticipant.user_id == user_id
        )
        if for_update:
            query = query.with_for_update()
        result = await self.session.scalars(query)
        return result.first()
