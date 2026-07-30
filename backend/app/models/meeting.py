from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import MeetingStatus, ParticipantResponse

if TYPE_CHECKING:
    from app.models.busy_interval import BusyInterval
    from app.models.user import User


class MeetingProposal(TimestampMixin, Base):
    __tablename__ = "meeting_proposals"
    __table_args__ = (
        CheckConstraint("start_at < end_at", name="valid_range"),
        Index("ix_meeting_proposals_creator_status", "creator_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    creator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(300))
    meeting_url: Mapped[str | None] = mapped_column(String(2048))
    reminder_minutes: Mapped[int] = mapped_column(default=30, server_default="30")
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus, name="meeting_status", values_callable=lambda e: [x.value for x in e]),
        default=MeetingStatus.PENDING,
        server_default=MeetingStatus.PENDING.value,
    )

    creator: Mapped["User"] = relationship(back_populates="created_meetings")
    participants: Mapped[list["MeetingParticipant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    calendar_intervals: Mapped[list["BusyInterval"]] = relationship(back_populates="meeting")


class MeetingParticipant(Base):
    __tablename__ = "meeting_participants"
    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_participants_meeting_user"),
        Index("ix_meeting_participants_user_response", "user_id", "response"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meeting_proposals.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    response: Mapped[ParticipantResponse] = mapped_column(
        Enum(
            ParticipantResponse,
            name="participant_response",
            values_callable=lambda e: [x.value for x in e],
        ),
        default=ParticipantResponse.PENDING,
        server_default=ParticipantResponse.PENDING.value,
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    meeting: Mapped["MeetingProposal"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship(back_populates="meeting_participations")
