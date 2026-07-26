import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode

import pytest
from app.core.config import Settings
from app.core.errors import AppError
from app.core.telegram_auth import verify_telegram_init_data


def settings() -> Settings:
    return Settings(
        app_secret_key="test-secret-key-that-is-long-enough-2026",
        bot_token="123456:test-token",
        database_url="postgresql+asyncpg://test:test@localhost/test",
    )


def signed_init_data(auth_date: datetime) -> str:
    values = {
        "auth_date": str(int(auth_date.timestamp())),
        "query_id": "query-1",
        "user": json.dumps({"id": 42, "first_name": "Ada", "username": "ada"}),
    }
    check = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", settings().bot_token.encode(), hashlib.sha256).digest()
    values["hash"] = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    return urlencode(values)


@pytest.mark.asyncio
async def test_valid_signature_can_be_reused_while_fresh() -> None:
    now = datetime(2026, 7, 24, 8, tzinfo=UTC)
    init_data = signed_init_data(now)
    verified = await verify_telegram_init_data(init_data, settings(), now)
    assert verified.user.id == 42
    repeated = await verify_telegram_init_data(init_data, settings(), now)
    assert repeated.user.id == 42


@pytest.mark.asyncio
async def test_stale_init_data_is_rejected() -> None:
    now = datetime(2026, 7, 24, 8, tzinfo=UTC)
    with pytest.raises(AppError, match="expired"):
        await verify_telegram_init_data(signed_init_data(now - timedelta(hours=1)), settings(), now)
