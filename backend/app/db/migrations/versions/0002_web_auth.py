"""Add web authentication fields.

Revision ID: 0002
Revises: 0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("users", "telegram_id", existing_type=sa.BigInteger(), nullable=True)
    op.add_column("users", sa.Column("email", sa.String(length=320), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.String(length=512), nullable=True))
    op.alter_column("users", "username", existing_type=sa.String(length=32), type_=sa.String(length=64))
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.execute("CREATE UNIQUE INDEX uq_users_username_lower ON users (lower(username)) WHERE username IS NOT NULL")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_username_lower")
    op.drop_index("ix_users_email", table_name="users")
    op.alter_column("users", "username", existing_type=sa.String(length=64), type_=sa.String(length=32))
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email")
    op.alter_column("users", "telegram_id", existing_type=sa.BigInteger(), nullable=False)
