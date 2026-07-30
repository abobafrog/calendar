from datetime import datetime, timedelta

from pydantic import Field, model_validator

from app.models.enums import MeetingStatus, ParticipantResponse
from app.schemas.common import APIModel, DateRangeMixin
from app.schemas.users import UserSummary


class MeetingCreate(DateRangeMixin):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    location: str | None = Field(default=None, max_length=300)
    meeting_url: str | None = Field(default=None, max_length=2048)
    reminder_minutes: int = Field(default=30, ge=0, le=10080)
    participant_ids: list[int] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def valid_range(self) -> "MeetingCreate":
        if self.start_at >= self.end_at:
            raise ValueError("Начало должно быть раньше конца")
        if self.end_at - self.start_at > timedelta(hours=24):
            raise ValueError("Встреча не может длиться больше 24 часов")
        return self


class MeetingParticipantResponse(APIModel):
    id: int
    user: UserSummary
    response: ParticipantResponse
    responded_at: datetime | None


class MeetingResponse(APIModel):
    id: int
    creator_id: int
    title: str
    description: str | None
    location: str | None
    meeting_url: str | None
    reminder_minutes: int
    start_at: datetime
    end_at: datetime
    status: MeetingStatus
    participants: list[MeetingParticipantResponse]
    created_at: datetime
    updated_at: datetime
    has_conflict: bool = False
