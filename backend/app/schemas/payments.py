from datetime import datetime
from typing import Literal

from pydantic import Field

from app.schemas.common import APIModel

PaymentMethod = Literal["visa", "sbp", "mir_pay"]
PaymentPurpose = Literal["busy_interval", "donation"]


class DonationCreate(APIModel):
    amount: int = Field(ge=1, le=1_000_000)
    method: PaymentMethod


class PaymentResponse(APIModel):
    id: int
    amount: int
    purpose: PaymentPurpose
    method: PaymentMethod
    created_at: datetime


class PaymentSummary(APIModel):
    total_amount: int
    payments: list[PaymentResponse]
