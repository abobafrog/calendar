from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Boolean, CheckConstraint, Enum, String, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import TimeFormat

if TYPE_CHECKING:
    from app.models.busy_interval import BusyInterval
    from app.models.friendship import Friendship
    from app.models.meeting import MeetingParticipant, MeetingProposal
    from app.models.notification import Notification


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("week_starts_on BETWEEN 1 AND 7", name="valid_week_start"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(512))
    username: Mapped[str | None] = mapped_column(String(64), index=True)
    first_name: Mapped[str] = mapped_column(String(128))
    last_name: Mapped[str | None] = mapped_column(String(128))
    photo_url: Mapped[str | None] = mapped_column(String(2048))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC", server_default="UTC")
    invite_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    week_starts_on: Mapped[int] = mapped_column(default=1, server_default="1")
    time_format: Mapped[TimeFormat] = mapped_column(
        Enum(TimeFormat, name="time_format", values_callable=lambda e: [x.value for x in e]),
        default=TimeFormat.H24,
        server_default=TimeFormat.H24.value,
    )
    workday_start: Mapped[time] = mapped_column(Time, default=time(9), server_default="09:00:00")
    workday_end: Mapped[time] = mapped_column(Time, default=time(18), server_default="18:00:00")
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")

    requested_friendships: Mapped[list["Friendship"]] = relationship(
        foreign_keys="Friendship.requester_id", back_populates="requester"
    )
    received_friendships: Mapped[list["Friendship"]] = relationship(
        foreign_keys="Friendship.addressee_id", back_populates="addressee"
    )
    busy_intervals: Mapped[list["BusyInterval"]] = relationship(back_populates="user")
    created_meetings: Mapped[list["MeetingProposal"]] = relationship(back_populates="creator")
    meeting_participations: Mapped[list["MeetingParticipant"]] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
