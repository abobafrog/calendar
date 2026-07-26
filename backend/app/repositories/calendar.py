from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.busy_interval import BusyInterval


class CalendarRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, interval_id: int, for_update: bool = False) -> BusyInterval | None:
        query = select(BusyInterval).where(BusyInterval.id == interval_id)
        if for_update:
            query = query.with_for_update()
        result = await self.session.scalars(query)
        return result.first()

    async def list_range(self, user_ids: list[int], start_at: datetime, end_at: datetime) -> list[BusyInterval]:
        result = await self.session.scalars(
            select(BusyInterval)
            .where(
                BusyInterval.user_id.in_(user_ids),
                BusyInterval.start_at < end_at,
                BusyInterval.end_at > start_at,
            )
            .order_by(BusyInterval.start_at, BusyInterval.end_at)
        )
        return list(result)

    async def list_touching(
        self,
        user_id: int,
        start_at: datetime,
        end_at: datetime,
        *,
        exclude_id: int | None = None,
    ) -> list[BusyInterval]:
        query = select(BusyInterval).where(
            BusyInterval.user_id == user_id,
            BusyInterval.meeting_id.is_(None),
            BusyInterval.start_at <= end_at,
            BusyInterval.end_at >= start_at,
        )
        if exclude_id is not None:
            query = query.where(BusyInterval.id != exclude_id)
        result = await self.session.scalars(query.order_by(BusyInterval.start_at).with_for_update())
        return list(result)

    async def delete_many(self, interval_ids: list[int]) -> None:
        if interval_ids:
            await self.session.execute(delete(BusyInterval).where(BusyInterval.id.in_(interval_ids)))

    async def delete_for_meeting(self, meeting_id: int) -> None:
        await self.session.execute(delete(BusyInterval).where(BusyInterval.meeting_id == meeting_id))

    async def has_conflict(
        self, user_id: int, start_at: datetime, end_at: datetime, meeting_id: int | None = None
    ) -> bool:
        query = select(BusyInterval.id).where(
            BusyInterval.user_id == user_id,
            BusyInterval.start_at < end_at,
            BusyInterval.end_at > start_at,
        )
        if meeting_id is not None:
            query = query.where((BusyInterval.meeting_id.is_(None)) | (BusyInterval.meeting_id != meeting_id))
        return await self.session.scalar(query.limit(1)) is not None
