from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Enum, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import IntervalVisibility

if TYPE_CHECKING:
    from app.models.user import User


class TaskTemplate(TimestampMixin, Base):
    __tablename__ = "task_templates"
    __table_args__ = (Index("ix_task_templates_user_title", "user_id", "title"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    duration_minutes: Mapped[int] = mapped_column(Integer, default=60, server_default="60")
    visibility: Mapped[IntervalVisibility] = mapped_column(
        Enum(
            IntervalVisibility,
            name="interval_visibility",
            values_callable=lambda e: [x.value for x in e],
            create_type=False,
        ),
        default=IntervalVisibility.CLOSED,
        server_default=IntervalVisibility.CLOSED.value,
    )

    user: Mapped["User"] = relationship(back_populates="task_templates")
