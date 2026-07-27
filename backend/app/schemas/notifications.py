from datetime import datetime
from typing import Any

from app.schemas.common import APIModel


class NotificationResponse(APIModel):
    id: int
    user_id: int
    type: str
    payload: dict[str, Any]
    read_at: datetime | None
    created_at: datetime
