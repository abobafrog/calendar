from datetime import UTC, datetime, timedelta

import jwt
import pytest
from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import (
    PASSWORD_ITERATIONS,
    TOKEN_AUDIENCE,
    TOKEN_ISSUER,
    create_access_token,
    decode_access_token,
    hash_password,
    password_needs_rehash,
    verify_password,
)
from pydantic import ValidationError

TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"


def settings() -> Settings:
    return Settings(
        app_secret_key=TEST_SECRET,
        database_url="postgresql+asyncpg://test:test@localhost/test",
    )


def test_access_token_has_bounded_verified_claims() -> None:
    token, expires_at = create_access_token(42, settings())
    payload = decode_access_token(token, settings())

    assert payload["sub"] == "42"
    assert payload["iss"] == TOKEN_ISSUER
    assert payload["aud"] == TOKEN_AUDIENCE
    assert payload["jti"]
    assert expires_at <= datetime.now(UTC) + timedelta(hours=8, seconds=2)


def test_legacy_token_without_required_claims_is_rejected() -> None:
    legacy = jwt.encode(
        {"sub": "42", "exp": datetime.now(UTC) + timedelta(hours=1), "type": "access"},
        TEST_SECRET,
        algorithm="HS256",
    )

    with pytest.raises(AppError, match="недействительна или истекла"):
        decode_access_token(legacy, settings())


def test_password_hash_uses_current_work_factor_and_detects_legacy_hash() -> None:
    current = hash_password("correct horse battery staple")
    legacy = current.replace(f"${PASSWORD_ITERATIONS}$", "$210000$", 1)

    assert verify_password("correct horse battery staple", current)
    assert not verify_password("wrong password", current)
    assert not password_needs_rehash(current)
    assert password_needs_rehash(legacy)


def test_short_signing_secret_is_rejected() -> None:
    with pytest.raises(ValidationError, match="43"):
        Settings(app_secret_key="too-short", database_url="postgresql+asyncpg://test:test@localhost/test")
