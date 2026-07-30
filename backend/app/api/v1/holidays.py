from datetime import datetime
from zoneinfo import ZoneInfo

from app.core.security import get_current_user
from app.models.user import User
from app.schemas.holidays import HolidayResponse
from app.services.holidays import get_random_holiday
from fastapi import APIRouter, Depends, Response

router = APIRouter(prefix="/holidays", tags=["holidays"])


@router.get("/today", response_model=HolidayResponse | None)
async def today_holiday(
    response: Response,
    _current_user: User = Depends(get_current_user),
) -> HolidayResponse | None:
    response.headers["Cache-Control"] = "no-store"
    today = datetime.now(ZoneInfo("Europe/Moscow")).date()
    return await get_random_holiday(today)
