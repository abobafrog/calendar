import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from urllib.parse import parse_qsl

from app.core.config import Settings
from app.core.errors import AppError
from pydantic import BaseModel, ConfigDict, Field, ValidationError


class TelegramUserData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    first_name: str = Field(max_length=128)
    last_name: str | None = Field(default=None, max_length=128)
    username: str | None = Field(default=None, max_length=32)
    photo_url: str | None = Field(default=None, max_length=2048)


@dataclass(frozen=True, slots=True)
class VerifiedTelegramData:
    user: TelegramUserData
    auth_date: datetime
    query_id: str | None


async def verify_telegram_init_data(
    init_data: str,
    settings: Settings,
    now: datetime | None = None,
) -> VerifiedTelegramData:
    if not settings.bot_token:
        raise AppError(503, "telegram_auth_unavailable", "Telegram authentication is not configured")
    if not init_data or len(init_data) > 16_384:
        raise AppError(400, "invalid_init_data", "Telegram init data is missing or too large")

    pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise AppError(401, "invalid_telegram_signature", "Telegram signature is missing")

    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", settings.bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise AppError(401, "invalid_telegram_signature", "Telegram signature is invalid")

    current_time = now or datetime.now(UTC)
    try:
        auth_date = datetime.fromtimestamp(int(pairs["auth_date"]), tz=UTC)
    except (KeyError, TypeError, ValueError) as exc:
        raise AppError(401, "invalid_auth_date", "Telegram auth date is invalid") from exc
    age = (current_time - auth_date).total_seconds()
    if age < -30 or age > settings.telegram_auth_max_age_seconds:
        raise AppError(401, "stale_init_data", "Telegram init data is expired")

    try:
        user = TelegramUserData.model_validate(json.loads(pairs["user"]))
    except (KeyError, json.JSONDecodeError, ValidationError) as exc:
        raise AppError(401, "invalid_telegram_user", "Telegram user data is invalid") from exc
    return VerifiedTelegramData(user=user, auth_date=auth_date, query_id=pairs.get("query_id"))
