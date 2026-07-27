from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, CheckConstraint, Enum, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import FriendshipStatus

if TYPE_CHECKING:
    from app.models.user import User


class Friendship(TimestampMixin, Base):
    __tablename__ = "friendships"
    __table_args__ = (
        CheckConstraint("requester_id <> addressee_id", name="different_users"),
        Index("ix_friendships_requester_status", "requester_id", "status"),
        Index("ix_friendships_addressee_status", "addressee_id", "status"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    addressee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[FriendshipStatus] = mapped_column(
        Enum(
            FriendshipStatus,
            name="friendship_status",
            values_callable=lambda e: [x.value for x in e],
        ),
        default=FriendshipStatus.PENDING,
        server_default=FriendshipStatus.PENDING.value,
    )
    blocked_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    requester_alias: Mapped[str | None] = mapped_column(String(128))
    addressee_alias: Mapped[str | None] = mapped_column(String(128))

    requester: Mapped["User"] = relationship(foreign_keys=[requester_id], back_populates="requested_friendships")
    addressee: Mapped["User"] = relationship(foreign_keys=[addressee_id], back_populates="received_friendships")
