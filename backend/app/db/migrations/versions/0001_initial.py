"""Initial schema.

Revision ID: 0001
Revises: None
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

friendship_status = sa.Enum("pending", "accepted", "rejected", "blocked", name="friendship_status")
interval_visibility = sa.Enum("private", "friends", "hidden", name="interval_visibility")
meeting_status = sa.Enum("pending", "confirmed", "cancelled", name="meeting_status")
participant_response = sa.Enum("pending", "accepted", "declined", name="participant_response")
time_format = sa.Enum("12h", "24h", name="time_format")


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(32)),
        sa.Column("first_name", sa.String(128), nullable=False),
        sa.Column("last_name", sa.String(128)),
        sa.Column("photo_url", sa.String(2048)),
        sa.Column("timezone", sa.String(64), nullable=False, server_default="UTC"),
        sa.Column("invite_code", sa.String(32), nullable=False),
        sa.Column("week_starts_on", sa.SmallInteger(), nullable=False, server_default="1"),
        sa.Column("time_format", time_format, nullable=False, server_default="24h"),
        sa.Column("workday_start", sa.Time(), nullable=False, server_default="09:00:00"),
        sa.Column("workday_end", sa.Time(), nullable=False, server_default="18:00:00"),
        sa.Column("notifications_enabled", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("week_starts_on BETWEEN 1 AND 7", name="ck_users_valid_week_start"),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"], unique=True)
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_invite_code", "users", ["invite_code"], unique=True)

    op.create_table(
        "friendships",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("requester_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("addressee_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", friendship_status, nullable=False, server_default="pending"),
        sa.Column("blocked_by_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("requester_id <> addressee_id", name="ck_friendships_different_users"),
    )
    op.create_index("ix_friendships_requester_status", "friendships", ["requester_id", "status"])
    op.create_index("ix_friendships_addressee_status", "friendships", ["addressee_id", "status"])
    op.execute(
        "CREATE UNIQUE INDEX uq_friendships_user_pair ON friendships "
        "(LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id))"
    )

    op.create_table(
        "meeting_proposals",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("creator_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", meeting_status, nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("start_at < end_at", name="ck_meeting_proposals_valid_range"),
    )
    op.create_index("ix_meeting_proposals_creator_status", "meeting_proposals", ["creator_id", "status"])

    op.create_table(
        "meeting_participants",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column(
            "meeting_id",
            sa.BigInteger(),
            sa.ForeignKey("meeting_proposals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("response", participant_response, nullable=False, server_default="pending"),
        sa.Column("responded_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("meeting_id", "user_id", name="uq_meeting_participants_meeting_user"),
    )
    op.create_index("ix_meeting_participants_user_response", "meeting_participants", ["user_id", "response"])

    op.create_table(
        "busy_intervals",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("meeting_id", sa.BigInteger(), sa.ForeignKey("meeting_proposals.id", ondelete="CASCADE")),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("title", sa.String(200)),
        sa.Column("visibility", interval_visibility, nullable=False, server_default="private"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("start_at < end_at", name="ck_busy_intervals_valid_range"),
    )
    op.create_index("ix_busy_intervals_user_range", "busy_intervals", ["user_id", "start_at", "end_at"])
    op.create_index("ix_busy_intervals_meeting_user", "busy_intervals", ["meeting_id", "user_id"], unique=True)

    op.create_table(
        "notifications",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("read_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_unread", "notifications", ["user_id", "read_at"])


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("busy_intervals")
    op.drop_table("meeting_participants")
    op.drop_table("meeting_proposals")
    op.execute("DROP INDEX IF EXISTS uq_friendships_user_pair")
    op.drop_table("friendships")
    op.drop_table("users")
    bind = op.get_bind()
    for enum in (
        time_format,
        participant_response,
        meeting_status,
        interval_visibility,
        friendship_status,
    ):
        enum.drop(bind, checkfirst=True)
