from datetime import datetime

from pydantic import Field, model_validator

from app.models.enums import MeetingStatus, ParticipantResponse
from app.schemas.common import APIModel, DateRangeMixin
from app.schemas.users import UserSummary


class MeetingCreate(DateRangeMixin):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    participant_ids: list[int] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def valid_range(self) -> "MeetingCreate":
        if self.start_at >= self.end_at:
            raise ValueError("start_at must be earlier than end_at")
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
    start_at: datetime
    end_at: datetime
    status: MeetingStatus
    participants: list[MeetingParticipantResponse]
    created_at: datetime
    updated_at: datetime
    has_conflict: bool = False
