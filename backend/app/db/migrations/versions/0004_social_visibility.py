"""Add personal friend aliases and replace interval visibility modes."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("friendships", sa.Column("requester_alias", sa.String(length=128), nullable=True))
    op.add_column("friendships", sa.Column("addressee_alias", sa.String(length=128), nullable=True))

    op.execute("ALTER TABLE busy_intervals ALTER COLUMN visibility DROP DEFAULT")
    op.execute(
        """
        CREATE TYPE interval_visibility_v2 AS ENUM ('open', 'closed')
        """
    )
    op.execute(
        """
        ALTER TABLE busy_intervals
        ALTER COLUMN visibility TYPE interval_visibility_v2
        USING (
            CASE visibility::text
                WHEN 'hidden' THEN 'closed'
                ELSE 'open'
            END
        )::interval_visibility_v2
        """
    )
    op.execute("DROP TYPE interval_visibility")
    op.execute("ALTER TYPE interval_visibility_v2 RENAME TO interval_visibility")
    op.execute("ALTER TABLE busy_intervals ALTER COLUMN visibility SET DEFAULT 'open'")


def downgrade() -> None:
    op.execute("ALTER TABLE busy_intervals ALTER COLUMN visibility DROP DEFAULT")
    op.execute("CREATE TYPE interval_visibility_v1 AS ENUM ('private', 'friends', 'hidden')")
    op.execute(
        """
        ALTER TABLE busy_intervals
        ALTER COLUMN visibility TYPE interval_visibility_v1
        USING (
            CASE visibility::text
                WHEN 'closed' THEN 'hidden'
                ELSE 'private'
            END
        )::interval_visibility_v1
        """
    )
    op.execute("DROP TYPE interval_visibility")
    op.execute("ALTER TYPE interval_visibility_v1 RENAME TO interval_visibility")
    op.execute("ALTER TABLE busy_intervals ALTER COLUMN visibility SET DEFAULT 'private'")
    op.drop_column("friendships", "addressee_alias")
    op.drop_column("friendships", "requester_alias")
