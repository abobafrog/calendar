"""Remove VK authentication leftovers.

Revision ID: 0003
Revises: 0002
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_vk_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS vk_id")


def downgrade() -> None:
    pass
