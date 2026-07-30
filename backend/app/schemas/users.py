from datetime import datetime, time
from typing import Literal

from pydantic import Field, field_validator, model_validator

from app.models.enums import IntervalVisibility, TimeFormat
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
    sleep_start: time
    sleep_end: time
    minimum_break_minutes: int
    undesirable_weekdays: list[int]
    default_visibility: IntervalVisibility
    share_details_with_friends: bool
    details_access_until: datetime | None
    notifications_enabled: bool
    holiday_categories: list[HolidayCategory]
    created_at: datetime
    updated_at: datetime

    @field_validator("sleep_start", mode="before")
    @classmethod
    def default_sleep_start(cls, value: object) -> object:
        return value or time(23)

    @field_validator("sleep_end", mode="before")
    @classmethod
    def default_sleep_end(cls, value: object) -> object:
        return value or time(7)

    @field_validator("minimum_break_minutes", mode="before")
    @classmethod
    def default_minimum_break(cls, value: object) -> object:
        return 15 if value is None else value

    @field_validator("undesirable_weekdays", mode="before")
    @classmethod
    def default_undesirable_weekdays(cls, value: object) -> object:
        return [] if value is None else value

    @field_validator("default_visibility", mode="before")
    @classmethod
    def default_interval_visibility(cls, value: object) -> object:
        return value or IntervalVisibility.CLOSED

    @field_validator("share_details_with_friends", mode="before")
    @classmethod
    def default_share_details(cls, value: object) -> object:
        return True if value is None else value

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
    sleep_start: time | None = None
    sleep_end: time | None = None
    minimum_break_minutes: int | None = Field(default=None, ge=0, le=180)
    undesirable_weekdays: list[int] | None = Field(default=None, max_length=7)
    default_visibility: IntervalVisibility | None = None
    share_details_with_friends: bool | None = None
    details_access_until: datetime | None = None
    notifications_enabled: bool | None = None
    holiday_categories: list[HolidayCategory] | None = Field(default=None, max_length=5)

    @field_validator("holiday_categories")
    @classmethod
    def unique_holiday_categories(cls, value: list[HolidayCategory] | None) -> list[HolidayCategory] | None:
        if value is not None and len(value) != len(set(value)):
            raise ValueError("Категории праздников не должны повторяться")
        return value

    @field_validator("undesirable_weekdays")
    @classmethod
    def valid_undesirable_weekdays(cls, value: list[int] | None) -> list[int] | None:
        if value is not None and (len(value) != len(set(value)) or any(day < 1 or day > 7 for day in value)):
            raise ValueError("Дни недели должны быть уникальными числами от 1 до 7")
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
