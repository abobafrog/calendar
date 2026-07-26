from datetime import datetime

from pydantic import Field, model_validator

from app.models.enums import IntervalVisibility
from app.schemas.common import APIModel, DateRangeMixin
from app.schemas.users import UserSummary


class CalendarRange(DateRangeMixin):
    pass


class BusyIntervalCreate(DateRangeMixin):
    title: str | None = Field(default=None, max_length=200)
    visibility: IntervalVisibility = IntervalVisibility.PRIVATE

    @model_validator(mode="after")
    def valid_range(self) -> "BusyIntervalCreate":
        if self.start_at >= self.end_at:
            raise ValueError("start_at must be earlier than end_at")
        return self


class BusyIntervalBulkCreate(APIModel):
    intervals: list[BusyIntervalCreate] = Field(min_length=1, max_length=100)


class BusyIntervalUpdate(APIModel):
    start_at: datetime | None = None
    end_at: datetime | None = None
    title: str | None = Field(default=None, max_length=200)
    visibility: IntervalVisibility | None = None


class BusyIntervalResponse(APIModel):
    id: int
    user_id: int
    meeting_id: int | None
    start_at: datetime
    end_at: datetime
    title: str | None
    visibility: IntervalVisibility
    created_at: datetime
    updated_at: datetime


class FriendBusyInterval(APIModel):
    id: int
    user_id: int
    start_at: datetime
    end_at: datetime
    title: str | None
    visibility: IntervalVisibility


class UserCalendar(APIModel):
    user: UserSummary
    intervals: list[FriendBusyInterval]
