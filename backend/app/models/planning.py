from datetime import date, datetime, time
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class PlanningGroup(TimestampMixin, Base):
    __tablename__ = "planning_groups"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, server_default="60")
    preferred_start: Mapped[time] = mapped_column(Time, default=time(18), server_default="18:00:00")
    preferred_end: Mapped[time] = mapped_column(Time, default=time(22), server_default="22:00:00")

    owner: Mapped["User"] = relationship(foreign_keys=[owner_id])
    members: Mapped[list["PlanningGroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")


class PlanningGroupMember(Base):
    __tablename__ = "planning_group_members"
    __table_args__ = (UniqueConstraint("group_id", "user_id", name="uq_planning_group_member"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(ForeignKey("planning_groups.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))

    group: Mapped["PlanningGroup"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship()


class SchedulingPoll(TimestampMixin, Base):
    __tablename__ = "scheduling_polls"
    __table_args__ = (
        CheckConstraint("date_from <= date_to", name="valid_poll_dates"),
        Index("ix_scheduling_polls_creator_status", "creator_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    date_from: Mapped[date] = mapped_column(Date)
    date_to: Mapped[date] = mapped_column(Date)
    timezone: Mapped[str] = mapped_column(String(64))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    daily_start: Mapped[time] = mapped_column(Time)
    daily_end: Mapped[time] = mapped_column(Time)
    status: Mapped[str] = mapped_column(String(16), default="open", server_default="open")
    finalized_option_id: Mapped[int | None] = mapped_column(BigInteger)

    creator: Mapped["User"] = relationship()
    options: Mapped[list["SchedulingPollOption"]] = relationship(
        back_populates="poll", cascade="all, delete-orphan", order_by="SchedulingPollOption.start_at"
    )


class SchedulingPollOption(Base):
    __tablename__ = "scheduling_poll_options"
    __table_args__ = (CheckConstraint("start_at < end_at", name="valid_poll_option_range"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    poll_id: Mapped[int] = mapped_column(ForeignKey("scheduling_polls.id", ondelete="CASCADE"), index=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    poll: Mapped["SchedulingPoll"] = relationship(back_populates="options")
    votes: Mapped[list["SchedulingPollVote"]] = relationship(back_populates="option", cascade="all, delete-orphan")


class SchedulingPollVote(TimestampMixin, Base):
    __tablename__ = "scheduling_poll_votes"
    __table_args__ = (
        UniqueConstraint("option_id", "voter_key", name="uq_poll_option_voter"),
        CheckConstraint("response IN ('yes', 'maybe', 'no')", name="valid_poll_vote"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    option_id: Mapped[int] = mapped_column(ForeignKey("scheduling_poll_options.id", ondelete="CASCADE"))
    voter_key: Mapped[str] = mapped_column(String(96))
    voter_name: Mapped[str] = mapped_column(String(120))
    response: Mapped[str] = mapped_column(String(8))

    option: Mapped["SchedulingPollOption"] = relationship(back_populates="votes")
