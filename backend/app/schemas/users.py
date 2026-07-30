from datetime import datetime, time
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.models.enums import TimeFormat
from app.schemas.common import APIModel, validate_timezone

HolidayCategory = Literal["Всемирный", "Международный", "Национальный", "Религиозный", "Необычный"]


class UserSummary(APIModel):
    id: int
    username: str | None
    first_name: str
    last_name: str | None
    photo_url: str | None


class UserResponse(UserSummary):
    telegram_id: int | None = None
    timezone: str
    invite_code: str
    week_starts_on: int
    time_format: TimeFormat
    workday_start: time
    workday_end: time
    notifications_enabled: bool
    holiday_categories: list[HolidayCategory]
    created_at: datetime
    updated_at: datetime

    @field_validator("holiday_categories", mode="before")
    @classmethod
    def default_holiday_categories(cls, value: object) -> object:
        if value is None:
            return ["Всемирный", "Международный", "Национальный", "Религиозный", "Необычный"]
        return value


class UserUpdate(APIModel):
    first_name: str | None = Field(default=None, min_length=1, max_length=128)
    last_name: str | None = Field(default=None, max_length=128)
    username: str | None = Field(default=None, min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    timezone: str | None = None
    week_starts_on: int | None = Field(default=None, ge=1, le=7)
    time_format: TimeFormat | None = None
    workday_start: time | None = None
    workday_end: time | None = None
    notifications_enabled: bool | None = None
    holiday_categories: list[HolidayCategory] | None = Field(default=None, max_length=5)

    @field_validator("holiday_categories")
    @classmethod
    def unique_holiday_categories(cls, value: list[HolidayCategory] | None) -> list[HolidayCategory] | None:
        if value is not None and len(value) != len(set(value)):
            raise ValueError("Категории праздников не должны повторяться")
        return value

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str | None) -> str | None:
        return validate_timezone(value) if value is not None else None

    @model_validator(mode="after")
    def valid_workday(self) -> "UserUpdate":
        if self.workday_start and self.workday_end and self.workday_start >= self.workday_end:
            raise ValueError("Начало рабочего времени должно быть раньше конца")
        return self
