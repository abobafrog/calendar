import pytest
from app.core.errors import AppError
from app.services.permissions import PermissionService


class FakeFriendships:
    def __init__(self, accepted: bool) -> None:
        self.accepted = accepted

    async def is_friend(self, _left_id: int, _right_id: int) -> bool:
        return self.accepted


@pytest.mark.asyncio
async def test_stranger_cannot_access_calendar() -> None:
    service = PermissionService.__new__(PermissionService)
    service.friendships = FakeFriendships(False)  # type: ignore[assignment]
    with pytest.raises(AppError) as error:
        await service.require_calendar_access(1, 2)
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_accepted_friend_can_access_calendar() -> None:
    service = PermissionService.__new__(PermissionService)
    service.friendships = FakeFriendships(True)  # type: ignore[assignment]
    await service.require_calendar_access(1, 2)
