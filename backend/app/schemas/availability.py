from datetime import date, datetime, time

from pydantic import Field, field_validator, model_validator

from app.schemas.common import APIModel, validate_timezone


class AvailabilitySearchRequest(APIModel):
    participant_ids: list[int] = Field(min_length=1, max_length=20)
    date_from: date
    date_to: date
    daily_start: time
    daily_end: time
    minimum_duration_minutes: int = Field(ge=15, le=1440)
    weekdays: set[int] = Field(default_factory=lambda: {1, 2, 3, 4, 5})
    include_weekends: bool = False
    timezone: str

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        return validate_timezone(value)

    @field_validator("weekdays")
    @classmethod
    def valid_weekdays(cls, value: set[int]) -> set[int]:
        if not value or any(day < 1 or day > 7 for day in value):
            raise ValueError("weekdays must contain ISO weekday values 1 through 7")
        return value

    @model_validator(mode="after")
    def valid_search(self) -> "AvailabilitySearchRequest":
        if self.date_from > self.date_to:
            raise ValueError("date_from must not be after date_to")
        if self.daily_start >= self.daily_end:
            raise ValueError("daily_start must be earlier than daily_end")
        return self


class FreeSlotResponse(APIModel):
    start_at: datetime
    end_at: datetime
    duration_minutes: int


class AvailabilitySearchResponse(APIModel):
    timezone: str
    participants: list[int]
    slots: list[FreeSlotResponse]
