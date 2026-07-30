from app.api.deps import get_redis
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payments import DonationCreate, PaymentResponse, PaymentSummary
from app.services.payments import PaymentService
from fastapi import APIRouter, Depends, status
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/summary", response_model=PaymentSummary)
async def payment_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PaymentSummary:
    return await PaymentService(session).summary(current_user)


@router.post("/donations", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_donation(
    payload: DonationCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> Payment:
    await enforce_rate_limit(redis, f"rate:donation:{current_user.id}", RateLimit(30, 3600))
    return await PaymentService(session).record_donation(current_user, payload.amount, payload.method)
