from datetime import UTC, datetime, timedelta

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
        touching = [
            item
            for item in await self.repository.list_touching(actor.id, data.start_at, data.end_at)
            if item.visibility == data.visibility and item.title == data.title
        ]
        start_at = min([data.start_at, *(item.start_at for item in touching)])
        end_at = max([data.end_at, *(item.end_at for item in touching)])
        await self.repository.delete_many([item.id for item in touching])
        interval = BusyInterval(
            user_id=actor.id,
            start_at=start_at,
            end_at=end_at,
            title=data.title,
            visibility=data.visibility,
        )
        self.session.add(interval)
        await self.session.flush()
        return interval

    async def get(self, actor: User, interval_id: int) -> BusyInterval:
        interval = await self.repository.get_by_id(interval_id)
        if interval is None:
            raise AppError(404, "interval_not_found", "Дело в календаре не найдено")
        self.permissions.require_interval_owner(actor, interval)
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
            raise AppError(404, "interval_not_found", "Дело в календаре не найдено")
        self.permissions.require_interval_owner(actor, current)
        if current.meeting_id is not None:
            raise AppError(409, "meeting_interval", "Время встречи изменяется на странице встречи")
        start_at = data.start_at or current.start_at
        end_at = data.end_at or current.end_at
        if start_at.tzinfo is None or end_at.tzinfo is None or start_at >= end_at:
            raise AppError(422, "invalid_interval", "Укажите правильный период и часовой пояс")
        if end_at - start_at > timedelta(days=31):
            raise AppError(422, "interval_too_long", "Дело не может длиться больше 31 дня")
        current.start_at = start_at
        current.end_at = end_at
        if "title" in data.model_fields_set:
            current.title = data.title
        if data.visibility is not None:
            current.visibility = data.visibility
        touching = [
            item
            for item in await self.repository.list_touching(actor.id, start_at, end_at, exclude_id=current.id)
            if item.visibility == current.visibility and item.title == current.title
        ]
        if touching:
            current.start_at = min([start_at, *(item.start_at for item in touching)])
            current.end_at = max([end_at, *(item.end_at for item in touching)])
            await self.repository.delete_many([item.id for item in touching])
        await self.session.commit()
        await self.session.refresh(current)
        return current

    async def delete(self, actor: User, interval_id: int) -> None:
        interval = await self.repository.get_by_id(interval_id, for_update=True)
        if interval is None:
            raise AppError(404, "interval_not_found", "Дело в календаре не найдено")
        self.permissions.require_interval_owner(actor, interval)
        if interval.meeting_id is not None:
            raise AppError(409, "meeting_interval", "Чтобы удалить это время, отмените встречу")
        await self.session.delete(interval)
        await self.session.commit()

    async def list_friend_calendar(
        self, actor: User, owner_id: int, start_at: datetime, end_at: datetime
    ) -> list[FriendBusyInterval]:
        await self.permissions.require_calendar_access(actor.id, owner_id)
        intervals = await self.repository.list_range([owner_id], start_at, end_at)
        is_owner = actor.id == owner_id
        session = getattr(self, "session", None)
        owner = await session.get(User, owner_id) if session is not None else None
        details_visible = (
            True
            if owner is None
            else bool(
                owner.share_details_with_friends
                or (owner.details_access_until and owner.details_access_until > datetime.now(UTC))
            )
        )
        visible: list[FriendBusyInterval] = []
        for item in intervals:
            title = item.title if is_owner or (details_visible and item.visibility == IntervalVisibility.OPEN) else None
            response_visibility = item.visibility
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
