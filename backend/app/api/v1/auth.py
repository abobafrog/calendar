from app.core.config import Settings, get_settings
from app.db.session import get_session
from app.schemas.auth import AuthResponse, TelegramAuthRequest
from app.services.auth import AuthService
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/telegram", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def telegram_auth(
    payload: TelegramAuthRequest,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    return await AuthService(session, settings).authenticate(payload.init_data)
