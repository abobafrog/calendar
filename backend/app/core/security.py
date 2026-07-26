import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.db.session import get_session
from app.models.user import User
from app.repositories.users import UserRepository
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

bearer = HTTPBearer(auto_error=False)


def create_access_token(user_id: int, settings: Settings) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(seconds=settings.jwt_ttl_seconds)
    payload = {"sub": str(user_id), "iat": datetime.now(UTC), "exp": expires_at, "type": "access"}
    return jwt.encode(payload, settings.app_secret_key, algorithm="HS256"), expires_at


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    salt_value = base64.urlsafe_b64encode(salt).decode()
    digest_value = base64.urlsafe_b64encode(digest).decode()
    return f"pbkdf2_sha256$210000${salt_value}${digest_value}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        algorithm, iterations, salt_value, digest_value = password_hash.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.urlsafe_b64decode(salt_value.encode())
        expected = base64.urlsafe_b64decode(digest_value.encode())
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(actual, expected)


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    try:
        payload: dict[str, Any] = jwt.decode(token, settings.app_secret_key, algorithms=["HS256"])
    except jwt.PyJWTError as exc:
        raise AppError(401, "invalid_token", "Session is invalid or expired") from exc
    if payload.get("type") != "access" or not payload.get("sub"):
        raise AppError(401, "invalid_token", "Session token has an invalid type")
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AppError(401, "authentication_required", "Authentication required")
    payload = decode_access_token(credentials.credentials, settings)
    user = await UserRepository(session).get_by_id(int(payload["sub"]))
    if user is None:
        raise AppError(401, "user_not_found", "Session user no longer exists")
    return user
