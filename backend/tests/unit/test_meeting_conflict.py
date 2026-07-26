from datetime import UTC, datetime

import pytest
from app.core.errors import AppError
from app.models.enums import MeetingStatus, ParticipantResponse
from app.models.meeting import MeetingParticipant, MeetingProposal
from app.services.meetings import MeetingService


class FakeSession:
    async def execute(self, _statement: object) -> None:
        return None

    def add(self, _value: object) -> None:
        raise AssertionError("conflicting meeting must not create calendar intervals")


class FakeCalendar:
    async def has_conflict(self, user_id: int, _start: datetime, _end: datetime, _meeting_id: int) -> bool:
        return user_id == 3


class FakeNotifications:
    async def create(self, _user_id: int, _event: str, _payload: object) -> None:
        raise AssertionError("conflicting meeting must not send confirmation")


@pytest.mark.asyncio
async def test_participant_becoming_busy_prevents_confirmation() -> None:
    meeting = MeetingProposal(
        id=10,
        creator_id=1,
        title="Review",
        start_at=datetime(2026, 7, 25, 10, tzinfo=UTC),
        end_at=datetime(2026, 7, 25, 11, tzinfo=UTC),
        status=MeetingStatus.PENDING,
    )
    meeting.participants = [
        MeetingParticipant(user_id=user_id, response=ParticipantResponse.ACCEPTED) for user_id in (1, 2, 3)
    ]
    service = MeetingService.__new__(MeetingService)
    service.session = FakeSession()  # type: ignore[assignment]
    service.calendar = FakeCalendar()  # type: ignore[assignment]
    service.notifications = FakeNotifications()  # type: ignore[assignment]
    with pytest.raises(AppError) as error:
        await service._confirm(meeting)
    assert error.value.code == "meeting_conflict"
    assert meeting.status == MeetingStatus.PENDING
