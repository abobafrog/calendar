from datetime import UTC

from app.api.deps import get_redis
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.enums import ParticipantResponse
from app.models.meeting import MeetingProposal
from app.models.user import User
from app.repositories.calendar import CalendarRepository
from app.repositories.meetings import MeetingRepository
from app.schemas.meetings import MeetingCreate, MeetingResponse
from app.services.meetings import MeetingService
from fastapi import APIRouter, Depends, status
from fastapi.responses import Response
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/meetings", tags=["meetings"])


async def serialize_meeting(meeting: MeetingProposal, current_user: User, session: AsyncSession) -> MeetingResponse:
    has_conflict = await CalendarRepository(session).has_conflict(
        current_user.id, meeting.start_at, meeting.end_at, meeting.id
    )
    return MeetingResponse.model_validate(meeting).model_copy(update={"has_conflict": has_conflict})


@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    payload: MeetingCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> MeetingResponse:
    await enforce_rate_limit(redis, f"rate:meeting-create:{current_user.id}", RateLimit(30, 3600))
    meeting = await MeetingService(session, redis).create(current_user, payload)
    return await serialize_meeting(meeting, current_user, session)


@router.get("", response_model=list[MeetingResponse])
async def list_meetings(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[MeetingResponse]:
    meetings = await MeetingRepository(session).list_for_user(current_user.id)
    return [await serialize_meeting(item, current_user, session) for item in meetings]


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MeetingResponse:
    from app.core.errors import AppError

    meeting = await MeetingRepository(session).get_for_user(meeting_id, current_user.id)
    if meeting is None:
        raise AppError(404, "meeting_not_found", "Встреча не найдена")
    return await serialize_meeting(meeting, current_user, session)


@router.post("/{meeting_id}/accept", response_model=MeetingResponse)
async def accept_meeting(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> MeetingResponse:
    await enforce_rate_limit(redis, f"rate:meeting-response:{current_user.id}", RateLimit(120, 3600))
    meeting = await MeetingService(session, redis).respond(current_user, meeting_id, ParticipantResponse.ACCEPTED)
    return await serialize_meeting(meeting, current_user, session)


@router.post("/{meeting_id}/decline", response_model=MeetingResponse)
async def decline_meeting(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> MeetingResponse:
    await enforce_rate_limit(redis, f"rate:meeting-response:{current_user.id}", RateLimit(120, 3600))
    meeting = await MeetingService(session, redis).respond(current_user, meeting_id, ParticipantResponse.DECLINED)
    return await serialize_meeting(meeting, current_user, session)


@router.post("/{meeting_id}/cancel", response_model=MeetingResponse)
async def cancel_meeting(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> MeetingResponse:
    await enforce_rate_limit(redis, f"rate:meeting-response:{current_user.id}", RateLimit(120, 3600))
    meeting = await MeetingService(session, redis).cancel(current_user, meeting_id)
    return await serialize_meeting(meeting, current_user, session)


def _ics_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


@router.get("/{meeting_id}/calendar.ics", response_class=Response)
async def export_meeting_calendar(
    meeting_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    from app.core.errors import AppError

    meeting = await MeetingRepository(session).get_for_user(meeting_id, current_user.id)
    if meeting is None:
        raise AppError(404, "meeting_not_found", "Встреча не найдена")
    description_parts = [meeting.description or ""]
    if meeting.meeting_url:
        description_parts.append(meeting.meeting_url)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TimeTogether//Meeting//RU",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        f"UID:meeting-{meeting.id}@timetogether",
        f"DTSTAMP:{meeting.created_at.astimezone(UTC).strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{meeting.start_at.astimezone(UTC).strftime('%Y%m%dT%H%M%SZ')}",
        f"DTEND:{meeting.end_at.astimezone(UTC).strftime('%Y%m%dT%H%M%SZ')}",
        f"SUMMARY:{_ics_escape(meeting.title)}",
    ]
    if any(description_parts):
        lines.append(f"DESCRIPTION:{_ics_escape(chr(10).join(filter(None, description_parts)))}")
    if meeting.location:
        lines.append(f"LOCATION:{_ics_escape(meeting.location)}")
    if meeting.reminder_minutes > 0:
        lines.extend(
            [
                "BEGIN:VALARM",
                f"TRIGGER:-PT{meeting.reminder_minutes}M",
                "ACTION:DISPLAY",
                f"DESCRIPTION:{_ics_escape(meeting.title)}",
                "END:VALARM",
            ]
        )
    lines.extend(["END:VEVENT", "END:VCALENDAR", ""])
    return Response(
        "\r\n".join(lines),
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="meeting-{meeting.id}.ics"'},
    )
