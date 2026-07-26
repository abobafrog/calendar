from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import IntervalVisibility

if TYPE_CHECKING:
    from app.models.meeting import MeetingProposal
    from app.models.user import User


class BusyInterval(TimestampMixin, Base):
    __tablename__ = "busy_intervals"
    __table_args__ = (
        CheckConstraint("start_at < end_at", name="valid_range"),
        Index("ix_busy_intervals_user_range", "user_id", "start_at", "end_at"),
        Index("ix_busy_intervals_meeting_user", "meeting_id", "user_id", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    meeting_id: Mapped[int | None] = mapped_column(ForeignKey("meeting_proposals.id", ondelete="CASCADE"))
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    title: Mapped[str | None] = mapped_column(String(200))
    visibility: Mapped[IntervalVisibility] = mapped_column(
        Enum(
            IntervalVisibility,
            name="interval_visibility",
            values_callable=lambda e: [x.value for x in e],
        ),
        default=IntervalVisibility.PRIVATE,
        server_default=IntervalVisibility.PRIVATE.value,
    )

    user: Mapped["User"] = relationship(back_populates="busy_intervals")
    meeting: Mapped["MeetingProposal | None"] = relationship(back_populates="calendar_intervals")
