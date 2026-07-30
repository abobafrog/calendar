from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AppError
from app.models.user import User
from app.repositories.calendar import CalendarRepository
from app.repositories.friendships import FriendshipRepository
from app.schemas.availability import (
    AvailabilitySearchRequest,
    AvailabilitySearchResponse,
    FreeSlotResponse,
)


@dataclass(frozen=True, order=True, slots=True)
class TimeSpan:
    start_at: datetime
    end_at: datetime

    def __post_init__(self) -> None:
        if self.start_at.tzinfo is None or self.end_at.tzinfo is None:
            raise ValueError("Значения времени должны содержать часовой пояс")
        if self.start_at >= self.end_at:
            raise ValueError("Начало периода должно быть раньше конца")


def merge_spans(spans: list[TimeSpan]) -> list[TimeSpan]:
    if not spans:
        return []
    ordered = sorted(spans)
    merged = [ordered[0]]
    for span in ordered[1:]:
        current = merged[-1]
        if span.start_at <= current.end_at:
            merged[-1] = TimeSpan(current.start_at, max(current.end_at, span.end_at))
        else:
            merged.append(span)
    return merged


def subtract_busy(window: TimeSpan, busy: list[TimeSpan]) -> list[TimeSpan]:
    cursor = window.start_at
    free: list[TimeSpan] = []
    for span in busy:
        if span.end_at <= cursor or span.start_at >= window.end_at:
            continue
        if span.start_at > cursor:
            free.append(TimeSpan(cursor, min(span.start_at, window.end_at)))
        cursor = max(cursor, span.end_at)
        if cursor >= window.end_at:
            break
    if cursor < window.end_at:
        free.append(TimeSpan(cursor, window.end_at))
    return free


def _valid_local_to_utc(local_value: datetime, timezone: ZoneInfo, prefer_late: bool) -> datetime:
    candidates: list[datetime] = []
    for fold in (0, 1):
        aware = local_value.replace(tzinfo=timezone, fold=fold)
        round_trip = aware.astimezone(UTC).astimezone(timezone).replace(tzinfo=None)
        if round_trip == local_value:
            candidates.append(aware.astimezone(UTC))
    if candidates:
        return max(candidates) if prefer_late else min(candidates)

    probe = local_value
    for _ in range(180):
        probe += timedelta(minutes=1)
        aware = probe.replace(tzinfo=timezone)
        if aware.astimezone(UTC).astimezone(timezone).replace(tzinfo=None) == probe:
            return aware.astimezone(UTC)
    raise ValueError("Не удалось определить местное время при смене часового пояса")


def build_allowed_windows(
    date_from: date,
    date_to: date,
    daily_start: time,
    daily_end: time,
    weekdays: set[int],
    include_weekends: bool,
    timezone_name: str,
) -> list[TimeSpan]:
    timezone = ZoneInfo(timezone_name)
    windows: list[TimeSpan] = []
    day = date_from
    while day <= date_to:
        weekday = day.isoweekday()
        enabled = weekday in weekdays and (include_weekends or weekday <= 5)
        if enabled:
            local_start = datetime.combine(day, daily_start)
            local_end = datetime.combine(day, daily_end)
            start_at = _valid_local_to_utc(local_start, timezone, prefer_late=False)
            end_at = _valid_local_to_utc(local_end, timezone, prefer_late=True)
            if start_at < end_at:
                windows.append(TimeSpan(start_at, end_at))
        day += timedelta(days=1)
    return windows


def find_common_free_slots(
    windows: list[TimeSpan], busy_spans: list[TimeSpan], minimum_duration: timedelta
) -> list[TimeSpan]:
    merged_busy = merge_spans(busy_spans)
    return [
        slot
        for window in windows
        for slot in subtract_busy(window, merged_busy)
        if slot.end_at - slot.start_at >= minimum_duration
    ]


def intersect_spans(left: list[TimeSpan], right: list[TimeSpan]) -> list[TimeSpan]:
    """Return the overlap of two ordered collections of time spans."""
    overlaps: list[TimeSpan] = []
    for first in left:
        for second in right:
            start_at = max(first.start_at, second.start_at)
            end_at = min(first.end_at, second.end_at)
            if start_at < end_at:
                overlaps.append(TimeSpan(start_at, end_at))
    return merge_spans(overlaps)


def build_comfort_windows(user: User, date_from: date, date_to: date) -> list[TimeSpan]:
    """Build awake local-time windows, excluding explicitly undesirable weekdays."""
    timezone = ZoneInfo(user.timezone)
    windows: list[TimeSpan] = []
    day = date_from - timedelta(days=1)
    last_day = date_to + timedelta(days=1)
    undesirable = set(user.undesirable_weekdays or [])
    while day <= last_day:
        if day.isoweekday() not in undesirable:
            local_start = datetime.combine(day, user.sleep_end)
            local_end = datetime.combine(day, user.sleep_start)
            if local_end <= local_start:
                local_end += timedelta(days=1)
            start_at = _valid_local_to_utc(local_start, timezone, prefer_late=False)
            end_at = _valid_local_to_utc(local_end, timezone, prefer_late=True)
            if start_at < end_at:
                windows.append(TimeSpan(start_at, end_at))
        day += timedelta(days=1)
    return windows


class AvailabilityService:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self.session = session
        self.settings = settings
        self.calendar = CalendarRepository(session)
        self.friendships = FriendshipRepository(session)

    async def search(self, actor: User, data: AvailabilitySearchRequest) -> AvailabilitySearchResponse:
        range_days = (data.date_to - data.date_from).days + 1
        if range_days > self.settings.max_availability_range_days:
            raise AppError(422, "range_too_wide", "Выбран слишком большой период поиска")

        participant_ids = sorted(set(data.participant_ids) | {actor.id})
        for participant_id in participant_ids:
            if participant_id != actor.id and not await self.friendships.is_friend(actor.id, participant_id):
                raise AppError(
                    403,
                    "availability_access_denied",
                    "В поиск времени можно добавлять только принятых друнов",
                )

        users = list(await self.session.scalars(select(User).where(User.id.in_(participant_ids))))

        windows = build_allowed_windows(
            data.date_from,
            data.date_to,
            data.daily_start,
            data.daily_end,
            data.weekdays,
            data.include_weekends,
            data.timezone,
        )
        if not windows:
            return AvailabilitySearchResponse(timezone=data.timezone, participants=participant_ids, slots=[])
        for user in users:
            windows = intersect_spans(
                windows,
                build_comfort_windows(user, data.date_from, data.date_to),
            )
            if not windows:
                return AvailabilitySearchResponse(timezone=data.timezone, participants=participant_ids, slots=[])
        busy = await self.calendar.list_range(participant_ids, windows[0].start_at, windows[-1].end_at)
        breaks = {user.id: timedelta(minutes=user.minimum_break_minutes) for user in users}
        slots = find_common_free_slots(
            windows,
            [
                TimeSpan(
                    item.start_at - breaks.get(item.user_id, timedelta()),
                    item.end_at + breaks.get(item.user_id, timedelta()),
                )
                for item in busy
            ],
            timedelta(minutes=data.minimum_duration_minutes),
        )
        return AvailabilitySearchResponse(
            timezone=data.timezone,
            participants=participant_ids,
            slots=[
                FreeSlotResponse(
                    start_at=slot.start_at,
                    end_at=slot.end_at,
                    duration_minutes=int((slot.end_at - slot.start_at).total_seconds() // 60),
                )
                for slot in slots
            ],
        )
