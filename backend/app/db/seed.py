import asyncio
from datetime import UTC, datetime, timedelta

from app.db.session import SessionFactory
from app.models.busy_interval import BusyInterval
from app.models.enums import FriendshipStatus, IntervalVisibility
from app.models.friendship import Friendship
from app.models.user import User
from sqlalchemy import select

SEED_USERS = [
    (900000001, "daria_demo", "Дарья", "Орлова", "Europe/Moscow", "demo-daria-2026"),
    (900000002, "alex_demo", "Алексей", "Смирнов", "Europe/Amsterdam", "demo-alex-2026"),
    (900000003, "maria_demo", "Мария", "Ким", "Asia/Almaty", "demo-maria-2026"),
    (900000004, "ivan_demo", "Иван", "Петров", "America/New_York", "demo-ivan-2026"),
]


async def seed() -> None:
    async with SessionFactory() as session:
        users: list[User] = []
        for telegram_id, username, first_name, last_name, timezone, invite_code in SEED_USERS:
            user = await session.scalar(select(User).where(User.telegram_id == telegram_id))
            if user is None:
                user = User(
                    telegram_id=telegram_id,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                    timezone=timezone,
                    invite_code=invite_code,
                )
                session.add(user)
                await session.flush()
            users.append(user)

        for friend in users[1:]:
            existing = await session.scalar(
                select(Friendship).where(
                    Friendship.requester_id == users[0].id,
                    Friendship.addressee_id == friend.id,
                )
            )
            if existing is None:
                session.add(
                    Friendship(
                        requester_id=users[0].id,
                        addressee_id=friend.id,
                        status=FriendshipStatus.ACCEPTED,
                    )
                )

        has_intervals = await session.scalar(
            select(BusyInterval.id).where(BusyInterval.user_id == users[0].id).limit(1)
        )
        if has_intervals is None:
            tomorrow = (datetime.now(UTC) + timedelta(days=1)).replace(hour=6, minute=0, second=0, microsecond=0)
            samples = [
                (users[0], 0, 90, "Планирование", IntervalVisibility.PRIVATE),
                (users[0], 240, 300, "Обед", IntervalVisibility.FRIENDS),
                (users[1], 60, 150, "Фокус", IntervalVisibility.HIDDEN),
                (users[2], 180, 300, "Дизайн-ревью", IntervalVisibility.FRIENDS),
                (users[3], 360, 450, None, IntervalVisibility.PRIVATE),
            ]
            for user, offset, duration, title, visibility in samples:
                session.add(
                    BusyInterval(
                        user_id=user.id,
                        start_at=tomorrow + timedelta(minutes=offset),
                        end_at=tomorrow + timedelta(minutes=offset + duration),
                        title=title,
                        visibility=visibility,
                    )
                )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
