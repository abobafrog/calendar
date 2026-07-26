from datetime import datetime, time

from pydantic import Field, field_validator, model_validator

from app.models.enums import TimeFormat
from app.schemas.common import APIModel, validate_timezone


class UserSummary(APIModel):
    id: int
    username: str | None
    first_name: str
    last_name: str | None
    photo_url: str | None


class UserResponse(UserSummary):
    telegram_id: int | None = None
    email: str | None = None
    timezone: str
    invite_code: str
    week_starts_on: int
    time_format: TimeFormat
    workday_start: time
    workday_end: time
    notifications_enabled: bool
    created_at: datetime
    updated_at: datetime


class UserUpdate(APIModel):
    timezone: str | None = None
    week_starts_on: int | None = Field(default=None, ge=1, le=7)
    time_format: TimeFormat | None = None
    workday_start: time | None = None
    workday_end: time | None = None
    notifications_enabled: bool | None = None

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str | None) -> str | None:
        return validate_timezone(value) if value is not None else None

    @model_validator(mode="after")
    def valid_workday(self) -> "UserUpdate":
        if self.workday_start and self.workday_end and self.workday_start >= self.workday_end:
            raise ValueError("workday_start must be earlier than workday_end")
        return self
