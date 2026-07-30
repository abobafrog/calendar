from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount BETWEEN 1 AND 1000000", name="valid_payment_amount"),
        CheckConstraint("purpose IN ('busy_interval', 'donation')", name="valid_payment_purpose"),
        CheckConstraint("method IN ('visa', 'sbp', 'mir_pay')", name="valid_payment_method"),
        Index("ix_payments_user_created", "user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    amount: Mapped[int] = mapped_column(BigInteger)
    purpose: Mapped[str] = mapped_column(String(32))
    method: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="payments")
