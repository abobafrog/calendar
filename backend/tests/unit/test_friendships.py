import pytest
from app.core.errors import AppError
from app.models.enums import FriendshipStatus
from app.models.friendship import Friendship
from app.models.user import User
from app.schemas.friendships import FriendRequestCreate
from app.services.friendships import FriendshipService


class FakeSession:
    async def commit(self) -> None:
        return None

    async def flush(self) -> None:
        return None

    def add(self, _value: object) -> None:
        return None


class FakeUsers:
    def __init__(self, target: User) -> None:
        self.target = target

    async def get_by_username(self, _username: str) -> User:
        return self.target

    async def get_by_invite_code(self, _code: str) -> User:
        return self.target


class FakeRepository:
    def __init__(self, relation: Friendship | None) -> None:
        self.relation = relation

    async def lock_users(self, _ids: list[int]) -> None:
        return None

    async def get_pair(self, _left_id: int, _right_id: int, for_update: bool = False) -> Friendship | None:
        return self.relation


class FakeNotifications:
    def __init__(self) -> None:
        self.events: list[str] = []

    async def create(self, _user_id: int, event: str, _payload: object) -> None:
        self.events.append(event)


def service_with(relation: Friendship | None, target: User) -> FriendshipService:
    service = FriendshipService.__new__(FriendshipService)
    service.session = FakeSession()  # type: ignore[assignment]
    service.repository = FakeRepository(relation)  # type: ignore[assignment]
    service.users = FakeUsers(target)  # type: ignore[assignment]
    service.notifications = FakeNotifications()  # type: ignore[assignment]
    return service


@pytest.mark.asyncio
async def test_crossed_pending_requests_become_accepted() -> None:
    actor = User(id=1, telegram_id=101, first_name="A", invite_code="actor-code")
    target = User(id=2, telegram_id=202, first_name="B", invite_code="target-code")
    reverse = Friendship(
        id=7,
        requester_id=target.id,
        addressee_id=actor.id,
        status=FriendshipStatus.PENDING,
    )
    service = service_with(reverse, target)
    result = await service.create_request(actor, FriendRequestCreate(username="target"))
    assert result.status == FriendshipStatus.ACCEPTED


@pytest.mark.asyncio
async def test_blocked_user_cannot_send_another_request() -> None:
    actor = User(id=1, telegram_id=101, first_name="A", invite_code="actor-code")
    target = User(id=2, telegram_id=202, first_name="B", invite_code="target-code")
    blocked = Friendship(
        id=8,
        requester_id=actor.id,
        addressee_id=target.id,
        status=FriendshipStatus.BLOCKED,
        blocked_by_id=target.id,
    )
    service = service_with(blocked, target)
    with pytest.raises(AppError) as error:
        await service.create_request(actor, FriendRequestCreate(username="target"))
    assert error.value.code == "friendship_blocked"
