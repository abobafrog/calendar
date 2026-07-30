from datetime import UTC, datetime, time

import pytest
from app.core.config import Settings
from app.models.enums import TimeFormat
from app.models.user import User
from app.schemas.auth import LoginRequest
from app.services import auth as auth_module
from app.services.auth import AuthService


class FakeSession:
    def __init__(self) -> None:
        self.committed = False
        self.refreshed = False

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, _user: User) -> None:
        self.refreshed = True


@pytest.mark.asyncio
async def test_login_refreshes_user_after_password_rehash(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime.now(UTC)
    user = User(
        id=1,
        telegram_id=None,
        email=None,
        password_hash="legacy-password-hash",
        username="tester",
        first_name="Тест",
        last_name=None,
        photo_url=None,
        timezone="UTC",
        invite_code="invite-code",
        week_starts_on=1,
        time_format=TimeFormat.H24,
        workday_start=time(9),
        workday_end=time(18),
        notifications_enabled=True,
        created_at=now,
        updated_at=now,
    )

    class FakeUsers:
        def __init__(self, _session: FakeSession) -> None:
            pass

        async def get_by_username(self, _username: str) -> User:
            return user

    monkeypatch.setattr(auth_module, "UserRepository", FakeUsers)
    monkeypatch.setattr(auth_module, "verify_password", lambda _password, _hash: True)
    monkeypatch.setattr(auth_module, "password_needs_rehash", lambda _hash: True)
    monkeypatch.setattr(auth_module, "hash_password", lambda _password: "current-password-hash")

    session = FakeSession()
    settings = Settings(
        app_secret_key="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        database_url="postgresql+asyncpg://test:test@localhost/test",
    )

    auth, _token = await AuthService(session, settings).login(LoginRequest(username="tester", password="password"))  # type: ignore[arg-type]

    assert session.committed
    assert session.refreshed
    assert auth.user.username == "tester"
    assert user.password_hash == "current-password-hash"
