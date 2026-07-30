import pytest
from app.schemas.payments import DonationCreate
from pydantic import ValidationError


def test_donation_accepts_one_million_rubles() -> None:
    donation = DonationCreate(amount=1_000_000, method="visa")
    assert donation.amount == 1_000_000


@pytest.mark.parametrize("amount", [0, 1_000_001])
def test_donation_rejects_amount_outside_limits(amount: int) -> None:
    with pytest.raises(ValidationError):
        DonationCreate(amount=amount, method="sbp")
