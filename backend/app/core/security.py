import base64
import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.db.session import get_session
from app.models.user import User
from app.repositories.users import UserRepository
from fastapi import Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

SESSION_COOKIE = "timetogether_session"
TOKEN_ISSUER = "timetogether"
TOKEN_AUDIENCE = "timetogether-api"
PASSWORD_ITERATIONS = 600_000


def create_access_token(user_id: int, settings: Settings) -> tuple[str, datetime]:
    expires_at = datetime.now(UTC) + timedelta(seconds=settings.jwt_ttl_seconds)
    payload = {
        "sub": str(user_id),
        "iat": datetime.now(UTC),
        "nbf": datetime.now(UTC),
        "exp": expires_at,
        "type": "access",
        "jti": str(uuid4()),
        "iss": TOKEN_ISSUER,
        "aud": TOKEN_AUDIENCE,
    }
    return jwt.encode(payload, settings.signing_key, algorithm="HS256"), expires_at


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS)
    salt_value = base64.urlsafe_b64encode(salt).decode()
    digest_value = base64.urlsafe_b64encode(digest).decode()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt_value}${digest_value}"


def password_needs_rehash(password_hash: str | None) -> bool:
    if not password_hash:
        return True
    try:
        algorithm, iterations, _salt, _digest = password_hash.split("$", 3)
        return algorithm != "pbkdf2_sha256" or int(iterations) < PASSWORD_ITERATIONS
    except (ValueError, TypeError):
        return True


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
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.signing_key,
            algorithms=["HS256"],
            audience=TOKEN_AUDIENCE,
            issuer=TOKEN_ISSUER,
            options={"require": ["sub", "iat", "nbf", "exp", "jti", "iss", "aud"]},
        )
    except jwt.PyJWTError as exc:
        raise AppError(401, "invalid_token", "Сессия недействительна или истекла") from exc
    if payload.get("type") != "access" or not payload.get("sub") or not payload.get("jti"):
        raise AppError(401, "invalid_token", "Неверный тип сессии")
    return payload


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if token is None:
        raise AppError(401, "authentication_required", "Необходимо войти в аккаунт")
    payload = decode_access_token(token, settings)
    if await request.app.state.redis.exists(f"revoked-session:{payload['jti']}"):
        raise AppError(401, "session_revoked", "Сессия завершена")
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError) as exc:
        raise AppError(401, "invalid_token", "Сессия содержит неверные данные пользователя") from exc
    user = await UserRepository(session).get_by_id(user_id)
    if user is None:
        raise AppError(401, "user_not_found", "Пользователь этой сессии больше не существует")
    return user


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.jwt_ttl_seconds,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        SESSION_COOKIE,
        httponly=True,
        secure=settings.is_production,
        samesite="strict",
        path="/",
    )


async def revoke_session(request: Request, settings: Settings) -> None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return
    try:
        payload = decode_access_token(token, settings)
    except AppError:
        return
    expires_in = max(1, int(payload["exp"] - datetime.now(UTC).timestamp()))
    await request.app.state.redis.set(f"revoked-session:{payload['jti']}", "1", ex=expires_in)
