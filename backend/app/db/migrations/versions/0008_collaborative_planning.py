"""Add collaborative planning, comfort and privacy settings.

Revision ID: 0008
Revises: 0007
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("sleep_start", sa.Time(), nullable=False, server_default="23:00:00"))
    op.add_column("users", sa.Column("sleep_end", sa.Time(), nullable=False, server_default="07:00:00"))
    op.add_column("users", sa.Column("minimum_break_minutes", sa.Integer(), nullable=False, server_default="15"))
    op.add_column(
        "users",
        sa.Column(
            "undesirable_weekdays",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "default_visibility",
            postgresql.ENUM("open", "closed", name="interval_visibility", create_type=False),
            nullable=False,
            server_default="closed",
        ),
    )
    op.add_column("users", sa.Column("share_details_with_friends", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("users", sa.Column("details_access_until", sa.DateTime(timezone=True), nullable=True))

    op.add_column("meeting_proposals", sa.Column("location", sa.String(length=300)))
    op.add_column("meeting_proposals", sa.Column("meeting_url", sa.String(length=2048)))
    op.add_column("meeting_proposals", sa.Column("reminder_minutes", sa.Integer(), nullable=False, server_default="30"))

    op.create_table(
        "planning_groups",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("owner_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("preferred_start", sa.Time(), nullable=False, server_default="18:00:00"),
        sa.Column("preferred_end", sa.Time(), nullable=False, server_default="22:00:00"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_planning_groups_owner_id", "planning_groups", ["owner_id"])
    op.create_table(
        "planning_group_members",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("group_id", sa.BigInteger(), sa.ForeignKey("planning_groups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("group_id", "user_id", name="uq_planning_group_member"),
    )
    op.create_table(
        "scheduling_polls",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("creator_id", sa.BigInteger(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("date_from", sa.Date(), nullable=False),
        sa.Column("date_to", sa.Date(), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("daily_start", sa.Time(), nullable=False),
        sa.Column("daily_end", sa.Time(), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
        sa.Column("finalized_option_id", sa.BigInteger()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("date_from <= date_to", name="ck_scheduling_polls_valid_poll_dates"),
    )
    op.create_index("ix_scheduling_polls_token", "scheduling_polls", ["token"], unique=True)
    op.create_index("ix_scheduling_polls_creator_status", "scheduling_polls", ["creator_id", "status"])
    op.create_table(
        "scheduling_poll_options",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column("poll_id", sa.BigInteger(), sa.ForeignKey("scheduling_polls.id", ondelete="CASCADE"), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("start_at < end_at", name="ck_scheduling_poll_options_valid_poll_option_range"),
    )
    op.create_index("ix_scheduling_poll_options_poll_id", "scheduling_poll_options", ["poll_id"])
    op.create_table(
        "scheduling_poll_votes",
        sa.Column("id", sa.BigInteger(), sa.Identity(), primary_key=True),
        sa.Column(
            "option_id",
            sa.BigInteger(),
            sa.ForeignKey("scheduling_poll_options.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("voter_key", sa.String(length=96), nullable=False),
        sa.Column("voter_name", sa.String(length=120), nullable=False),
        sa.Column("response", sa.String(length=8), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("option_id", "voter_key", name="uq_poll_option_voter"),
        sa.CheckConstraint("response IN ('yes', 'maybe', 'no')", name="ck_scheduling_poll_votes_valid_poll_vote"),
    )


def downgrade() -> None:
    op.drop_table("scheduling_poll_votes")
    op.drop_table("scheduling_poll_options")
    op.drop_table("scheduling_polls")
    op.drop_table("planning_group_members")
    op.drop_table("planning_groups")
    op.drop_column("meeting_proposals", "reminder_minutes")
    op.drop_column("meeting_proposals", "meeting_url")
    op.drop_column("meeting_proposals", "location")
    op.drop_column("users", "details_access_until")
    op.drop_column("users", "share_details_with_friends")
    op.drop_column("users", "default_visibility")
    op.drop_column("users", "undesirable_weekdays")
    op.drop_column("users", "minimum_break_minutes")
    op.drop_column("users", "sleep_end")
    op.drop_column("users", "sleep_start")
