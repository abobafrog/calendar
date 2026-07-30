"""Add fake payment history.

Revision ID: 0007
Revises: 0006
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.BigInteger(), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("amount BETWEEN 1 AND 1000000", name="valid_payment_amount"),
        sa.CheckConstraint(
            "purpose IN ('busy_interval', 'donation')",
            name="valid_payment_purpose",
        ),
        sa.CheckConstraint(
            "method IN ('visa', 'sbp', 'mir_pay')",
            name="valid_payment_method",
        ),
    )
    op.create_index("ix_payments_user_created", "payments", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_table("payments")
