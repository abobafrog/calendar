from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.common import APIModel
from app.schemas.users import UserResponse


class TelegramAuthRequest(APIModel):
    init_data: str = Field(min_length=1, max_length=16_384)


class RegisterRequest(APIModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=128)
    last_name: str | None = Field(default=None, max_length=128)
    username: str | None = Field(default=None, min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$")
    timezone: str = Field(default="UTC", max_length=64)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or normalized.startswith("@") or normalized.endswith("@"):
            raise ValueError("valid email is required")
        return normalized


class LoginRequest(APIModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class AuthResponse(APIModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: datetime
    user: UserResponse
