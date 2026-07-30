from datetime import datetime

from pydantic import Field

from app.models.enums import IntervalVisibility
from app.schemas.common import APIModel


class TaskTemplateCreate(APIModel):
    title: str = Field(min_length=1, max_length=200)
    duration_minutes: int = Field(default=60, ge=15, le=480)
    visibility: IntervalVisibility = IntervalVisibility.CLOSED


class TaskTemplateResponse(APIModel):
    id: str
    title: str
    duration_minutes: int
    visibility: IntervalVisibility
    system: bool
    created_at: datetime | None = None
