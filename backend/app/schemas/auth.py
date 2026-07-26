from datetime import datetime

from pydantic import Field

from app.schemas.common import APIModel
from app.schemas.users import UserResponse


class TelegramAuthRequest(APIModel):
    init_data: str = Field(min_length=1, max_length=16_384)


class AuthResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserResponse
