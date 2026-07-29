import hashlib

from app.api.deps import get_redis
from app.core.config import Settings, get_settings
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import clear_session_cookie, revoke_session, set_session_cookie
from app.db.session import get_session
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest, TelegramAuthRequest
from app.services.auth import AuthService
from fastapi import APIRouter, Depends, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    return forwarded.split(",", 1)[0].strip() if forwarded else (request.client.host if request.client else "unknown")


def username_key(username: str) -> str:
    return hashlib.sha256(username.lower().encode()).hexdigest()[:24]


@router.post("/telegram", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def telegram_auth(
    payload: TelegramAuthRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    redis: Redis = Depends(get_redis),
) -> AuthResponse:
    await enforce_rate_limit(redis, f"rate:auth:telegram:ip:{client_ip(request)}", RateLimit(30, 300))
    auth, token = await AuthService(session, settings).authenticate(payload.init_data)
    set_session_cookie(response, token, settings)
    return auth


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    redis: Redis = Depends(get_redis),
) -> AuthResponse:
    await enforce_rate_limit(redis, f"rate:auth:register:ip:{client_ip(request)}", RateLimit(10, 3600))
    auth, token = await AuthService(session, settings).register(payload)
    set_session_cookie(response, token, settings)
    return auth


@router.post("/login", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
    redis: Redis = Depends(get_redis),
) -> AuthResponse:
    await enforce_rate_limit(redis, f"rate:auth:login:ip:{client_ip(request)}", RateLimit(60, 900))
    await enforce_rate_limit(
        redis,
        f"rate:auth:login:user:{username_key(payload.username)}",
        RateLimit(10, 900),
    )
    auth, token = await AuthService(session, settings).login(payload)
    set_session_cookie(response, token, settings)
    return auth


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> Response:
    await revoke_session(request, settings)
    clear_session_cookie(response, settings)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response
