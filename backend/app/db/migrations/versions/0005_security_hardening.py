"""Harden profile data and username identity."""

from collections.abc import Sequence

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("UPDATE users SET photo_url = NULL WHERE telegram_id IS NULL")
    op.execute(
        """
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (
                PARTITION BY LOWER(username)
                ORDER BY (password_hash IS NOT NULL) DESC, id
            ) AS position
            FROM users
            WHERE username IS NOT NULL
        )
        UPDATE users
        SET username = NULL
        FROM ranked
        WHERE users.id = ranked.id AND ranked.position > 1
        """
    )
    op.execute("CREATE UNIQUE INDEX uq_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_username_lower")
