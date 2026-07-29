from datetime import UTC, datetime, timedelta

import pytest
from app.core.errors import AppError
from app.models.busy_interval import BusyInterval
from app.models.enums import IntervalVisibility
from app.models.user import User
from app.schemas.calendar import BusyIntervalUpdate
from app.services.calendar import CalendarService


class FakeCalendarRepository:
    def __init__(self, intervals: list[BusyInterval]) -> None:
        self.intervals = intervals

    async def list_range(self, _user_ids: list[int], _start_at: datetime, _end_at: datetime) -> list[BusyInterval]:
        return self.intervals


class AllowCalendarAccess:
    async def require_calendar_access(self, _actor_id: int, _owner_id: int) -> None:
        return None

    def require_interval_owner(self, _actor: User, _interval: BusyInterval) -> None:
        return None


class FakeUpdateRepository:
    def __init__(self, item: BusyInterval) -> None:
        self.item = item

    async def get_by_id(self, _interval_id: int, *, for_update: bool = False) -> BusyInterval:
        return self.item


class FakeSession:
    async def commit(self) -> None:
        return None


def interval(interval_id: int, visibility: IntervalVisibility, title: str) -> BusyInterval:
    return BusyInterval(
        id=interval_id,
        user_id=2,
        start_at=datetime(2026, 7, 29, 10, tzinfo=UTC),
        end_at=datetime(2026, 7, 29, 11, tzinfo=UTC),
        title=title,
        visibility=visibility,
    )


@pytest.mark.asyncio
async def test_friend_sees_open_title_and_closed_interval_as_busy() -> None:
    service = CalendarService.__new__(CalendarService)
    service.repository = FakeCalendarRepository(  # type: ignore[assignment]
        [
            interval(1, IntervalVisibility.OPEN, "Обед"),
            interval(2, IntervalVisibility.CLOSED, "Врач"),
        ]
    )
    service.permissions = AllowCalendarAccess()  # type: ignore[assignment]

    result = await service.list_friend_calendar(
        User(id=1, first_name="Друг"),
        2,
        datetime(2026, 7, 29, tzinfo=UTC),
        datetime(2026, 7, 30, tzinfo=UTC),
    )

    assert [item.title for item in result] == ["Обед", None]
    assert [item.id for item in result] == [1, 2]


@pytest.mark.asyncio
async def test_update_rejects_an_interval_longer_than_31_days() -> None:
    item = interval(1, IntervalVisibility.OPEN, "Отпуск")
    service = CalendarService.__new__(CalendarService)
    service.session = FakeSession()  # type: ignore[assignment]
    service.repository = FakeUpdateRepository(item)  # type: ignore[assignment]
    service.permissions = AllowCalendarAccess()  # type: ignore[assignment]

    with pytest.raises(AppError) as error:
        await service.update(
            User(id=2, first_name="Владелец"),
            item.id,
            BusyIntervalUpdate(end_at=item.start_at + timedelta(days=32)),
        )

    assert error.value.code == "interval_too_long"
