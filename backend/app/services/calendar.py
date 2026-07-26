from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.models.busy_interval import BusyInterval
from app.models.enums import IntervalVisibility
from app.models.user import User
from app.repositories.calendar import CalendarRepository
from app.schemas.calendar import BusyIntervalCreate, BusyIntervalUpdate, FriendBusyInterval
from app.services.permissions import PermissionService


class CalendarService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repository = CalendarRepository(session)
        self.permissions = PermissionService(session)

    async def create(self, actor: User, data: BusyIntervalCreate) -> BusyInterval:
        await self.session.execute(select(User.id).where(User.id == actor.id).with_for_update())
        touching = await self.repository.list_touching(actor.id, data.start_at, data.end_at)
        start_at = min([data.start_at, *(item.start_at for item in touching)])
        end_at = max([data.end_at, *(item.end_at for item in touching)])
        titles = {item.title for item in touching if item.title}
        title = data.title if not titles or titles == {data.title} else data.title or "Busy"
        visibility = data.visibility
        if touching and any(item.visibility != data.visibility for item in touching):
            visibility = IntervalVisibility.PRIVATE
        await self.repository.delete_many([item.id for item in touching])
        interval = BusyInterval(
            user_id=actor.id,
            start_at=start_at,
            end_at=end_at,
            title=title,
            visibility=visibility,
        )
        self.session.add(interval)
        await self.session.flush()
        return interval

    async def create_bulk(self, actor: User, intervals: list[BusyIntervalCreate]) -> list[BusyInterval]:
        for interval in sorted(intervals, key=lambda item: item.start_at):
            await self.create(actor, interval)
        await self.session.commit()
        start_at = min(item.start_at for item in intervals)
        end_at = max(item.end_at for item in intervals)
        return await self.repository.list_range([actor.id], start_at, end_at)

    async def update(self, actor: User, interval_id: int, data: BusyIntervalUpdate) -> BusyInterval:
        current = await self.repository.get_by_id(interval_id, for_update=True)
        if current is None:
            raise AppError(404, "interval_not_found", "Calendar interval not found")
        self.permissions.require_interval_owner(actor, current)
        if current.meeting_id is not None:
            raise AppError(409, "meeting_interval", "Meeting intervals are managed by the meeting")
        start_at = data.start_at or current.start_at
        end_at = data.end_at or current.end_at
        if start_at.tzinfo is None or end_at.tzinfo is None or start_at >= end_at:
            raise AppError(422, "invalid_interval", "A timezone-aware valid interval is required")
        current.start_at = start_at
        current.end_at = end_at
        if "title" in data.model_fields_set:
            current.title = data.title
        if data.visibility is not None:
            current.visibility = data.visibility
        touching = await self.repository.list_touching(actor.id, start_at, end_at, exclude_id=current.id)
        if touching:
            current.start_at = min([start_at, *(item.start_at for item in touching)])
            current.end_at = max([end_at, *(item.end_at for item in touching)])
            await self.repository.delete_many([item.id for item in touching])
        await self.session.commit()
        return current

    async def delete(self, actor: User, interval_id: int) -> None:
        interval = await self.repository.get_by_id(interval_id, for_update=True)
        if interval is None:
            raise AppError(404, "interval_not_found", "Calendar interval not found")
        self.permissions.require_interval_owner(actor, interval)
        if interval.meeting_id is not None:
            raise AppError(409, "meeting_interval", "Cancel the meeting to remove this interval")
        await self.session.delete(interval)
        await self.session.commit()

    async def list_friend_calendar(
        self, actor: User, owner_id: int, start_at: datetime, end_at: datetime
    ) -> list[FriendBusyInterval]:
        await self.permissions.require_calendar_access(actor.id, owner_id)
        intervals = await self.repository.list_range([owner_id], start_at, end_at)
        is_owner = actor.id == owner_id
        visible: list[FriendBusyInterval] = []
        for item in intervals:
            if not is_owner and item.visibility == IntervalVisibility.HIDDEN:
                continue
            title = item.title if is_owner or item.visibility == IntervalVisibility.FRIENDS else None
            response_visibility = item.visibility if is_owner else IntervalVisibility.FRIENDS
            visible.append(
                FriendBusyInterval(
                    id=item.id,
                    user_id=item.user_id,
                    start_at=item.start_at,
                    end_at=item.end_at,
                    title=title,
                    visibility=response_visibility,
                )
            )
        return visible
