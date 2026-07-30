from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payment import Payment
from app.models.user import User
from app.schemas.payments import PaymentMethod, PaymentSummary


class PaymentService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def record_busy_creation(self, actor: User, method: PaymentMethod) -> Payment:
        return await self._create(actor.id, 99, "busy_interval", method)

    async def record_donation(self, actor: User, amount: int, method: PaymentMethod) -> Payment:
        payment = await self._create(actor.id, amount, "donation", method)
        await self.session.commit()
        await self.session.refresh(payment)
        return payment

    async def summary(self, actor: User) -> PaymentSummary:
        total = await self.session.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.user_id == actor.id)
        )
        payments = list(
            await self.session.scalars(
                select(Payment)
                .where(Payment.user_id == actor.id)
                .order_by(Payment.created_at.desc(), Payment.id.desc())
                .limit(100)
            )
        )
        return PaymentSummary(total_amount=int(total or 0), payments=payments)

    async def _create(self, user_id: int, amount: int, purpose: str, method: str) -> Payment:
        payment = Payment(user_id=user_id, amount=amount, purpose=purpose, method=method)
        self.session.add(payment)
        await self.session.flush()
        return payment
