"""Add holiday category preferences.

Revision ID: 0006
Revises: 0005
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_CATEGORIES = '["Всемирный", "Международный", "Национальный", "Религиозный", "Необычный"]'


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "holiday_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(f"'{DEFAULT_CATEGORIES}'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "holiday_categories")
