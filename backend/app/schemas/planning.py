from datetime import date, datetime, time
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.schemas.availability import FreeSlotResponse
from app.schemas.common import APIModel, validate_timezone
from app.schemas.meetings import MeetingResponse
from app.schemas.users import UserSummary

VoteResponse = Literal["yes", "maybe", "no"]


class PlanningGroupCreate(APIModel):
    name: str = Field(min_length=1, max_length=120)
    member_ids: list[int] = Field(min_length=1, max_length=20)
    duration_minutes: int = Field(default=60, ge=15, le=480)
    preferred_start: time = time(18)
    preferred_end: time = time(22)

    @model_validator(mode="after")
    def valid_hours(self) -> "PlanningGroupCreate":
        if self.preferred_start >= self.preferred_end:
            raise ValueError("Начало предпочтительного времени должно быть раньше конца")
        return self


class PlanningGroupResponse(APIModel):
    id: int
    owner_id: int
    name: str
    duration_minutes: int
    preferred_start: time
    preferred_end: time
    members: list[UserSummary]
    created_at: datetime


class SmartSuggestionsResponse(APIModel):
    group: PlanningGroupResponse
    suggestions: list[FreeSlotResponse]


class SchedulingPollCreate(APIModel):
    title: str = Field(min_length=1, max_length=200)
    date_from: date
    date_to: date
    timezone: str
    duration_minutes: int = Field(default=60, ge=15, le=480)
    daily_start: time = time(10)
    daily_end: time = time(22)

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        return validate_timezone(value)

    @model_validator(mode="after")
    def valid_range(self) -> "SchedulingPollCreate":
        if self.date_from > self.date_to:
            raise ValueError("Начальная дата не может быть позже конечной")
        if (self.date_to - self.date_from).days > 13:
            raise ValueError("Для ссылки можно выбрать не больше 14 дней")
        if self.daily_start >= self.daily_end:
            raise ValueError("Начало дня должно быть раньше конца")
        return self


class PollVoteInput(APIModel):
    option_id: int
    response: VoteResponse


class PollResponseCreate(APIModel):
    voter_name: str = Field(min_length=1, max_length=120)
    voter_key: str | None = Field(default=None, min_length=16, max_length=96)
    votes: list[PollVoteInput] = Field(min_length=1, max_length=100)


class PollOptionResponse(APIModel):
    id: int
    start_at: datetime
    end_at: datetime
    yes: int
    maybe: int
    no: int
    score: int


class SchedulingPollResponse(APIModel):
    id: int
    token: str
    title: str
    creator: UserSummary
    timezone: str
    duration_minutes: int
    status: str
    finalized_option_id: int | None
    voters: list[str]
    options: list[PollOptionResponse]
    created_at: datetime


class PollVoteReceipt(APIModel):
    voter_key: str
    poll: SchedulingPollResponse


class PollFinalize(APIModel):
    option_id: int
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    location: str | None = Field(default=None, max_length=300)
    meeting_url: str | None = Field(default=None, max_length=2048)
    reminder_minutes: int = Field(default=30, ge=0, le=10080)


class PollFinalizeResponse(APIModel):
    poll: SchedulingPollResponse
    meeting: MeetingResponse
