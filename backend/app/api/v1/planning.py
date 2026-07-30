import secrets
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from app.api.deps import get_redis
from app.api.v1.meetings import serialize_meeting
from app.core.config import Settings, get_settings
from app.core.errors import AppError
from app.core.rate_limit import RateLimit, enforce_rate_limit
from app.core.security import get_current_user
from app.db.session import get_session
from app.models.busy_interval import BusyInterval
from app.models.enums import IntervalVisibility, MeetingStatus, ParticipantResponse
from app.models.meeting import MeetingParticipant, MeetingProposal
from app.models.planning import (
    PlanningGroup,
    PlanningGroupMember,
    SchedulingPoll,
    SchedulingPollOption,
    SchedulingPollVote,
)
from app.models.user import User
from app.repositories.friendships import FriendshipRepository
from app.repositories.meetings import MeetingRepository
from app.schemas.availability import AvailabilitySearchRequest
from app.schemas.planning import (
    PlanningGroupCreate,
    PlanningGroupResponse,
    PollFinalize,
    PollFinalizeResponse,
    PollOptionResponse,
    PollResponseCreate,
    PollVoteReceipt,
    SchedulingPollCreate,
    SchedulingPollResponse,
    SmartSuggestionsResponse,
)
from app.schemas.users import UserSummary
from app.services.availability import AvailabilityService, build_allowed_windows
from fastapi import APIRouter, Depends, Request, status
from redis.asyncio import Redis
from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter(tags=["planning"])


def serialize_group(group: PlanningGroup) -> PlanningGroupResponse:
    return PlanningGroupResponse(
        id=group.id,
        owner_id=group.owner_id,
        name=group.name,
        duration_minutes=group.duration_minutes,
        preferred_start=group.preferred_start,
        preferred_end=group.preferred_end,
        members=[UserSummary.model_validate(member.user) for member in group.members],
        created_at=group.created_at,
    )


def serialize_poll(poll: SchedulingPoll) -> SchedulingPollResponse:
    voters = sorted({vote.voter_name for option in poll.options for vote in option.votes})
    options = []
    for option in poll.options:
        counts = {"yes": 0, "maybe": 0, "no": 0}
        for vote in option.votes:
            counts[vote.response] += 1
        options.append(
            PollOptionResponse(
                id=option.id,
                start_at=option.start_at,
                end_at=option.end_at,
                yes=counts["yes"],
                maybe=counts["maybe"],
                no=counts["no"],
                score=counts["yes"] * 2 + counts["maybe"] - counts["no"] * 2,
            )
        )
    options.sort(key=lambda item: (item.no, -item.score, item.start_at))
    return SchedulingPollResponse(
        id=poll.id,
        token=poll.token,
        title=poll.title,
        creator=UserSummary.model_validate(poll.creator),
        timezone=poll.timezone,
        duration_minutes=poll.duration_minutes,
        status=poll.status,
        finalized_option_id=poll.finalized_option_id,
        voters=voters,
        options=options,
        created_at=poll.created_at,
    )


def poll_query() -> Select[tuple[SchedulingPoll]]:
    return select(SchedulingPoll).options(
        selectinload(SchedulingPoll.creator),
        selectinload(SchedulingPoll.options).selectinload(SchedulingPollOption.votes),
    )


async def get_poll_by_token(session: AsyncSession, token: str) -> SchedulingPoll:
    poll = (await session.scalars(poll_query().where(SchedulingPoll.token == token))).first()
    if poll is None:
        raise AppError(404, "poll_not_found", "Ссылка на встречу не найдена")
    return poll


async def get_owned_poll(session: AsyncSession, poll_id: int, user_id: int) -> SchedulingPoll:
    poll = (
        await session.scalars(poll_query().where(SchedulingPoll.id == poll_id, SchedulingPoll.creator_id == user_id))
    ).first()
    if poll is None:
        raise AppError(404, "poll_not_found", "Опрос не найден")
    return poll


@router.get("/groups", response_model=list[PlanningGroupResponse])
async def list_groups(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[PlanningGroupResponse]:
    groups = list(
        await session.scalars(
            select(PlanningGroup)
            .options(selectinload(PlanningGroup.members).selectinload(PlanningGroupMember.user))
            .where(PlanningGroup.owner_id == current_user.id)
            .order_by(PlanningGroup.created_at.desc())
        )
    )
    return [serialize_group(group) for group in groups]


@router.post("/groups", response_model=PlanningGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_group(
    payload: PlanningGroupCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PlanningGroupResponse:
    member_ids = sorted(set(payload.member_ids) | {current_user.id})
    users = list(await session.scalars(select(User).where(User.id.in_(member_ids))))
    if len(users) != len(member_ids):
        raise AppError(404, "group_member_not_found", "Один или несколько участников не найдены")
    friendships = FriendshipRepository(session)
    for user_id in member_ids:
        if user_id != current_user.id and not await friendships.is_friend(current_user.id, user_id):
            raise AppError(403, "group_member_not_friend", "В группу можно добавлять только друзей")
    group = PlanningGroup(
        owner_id=current_user.id,
        name=payload.name.strip(),
        duration_minutes=payload.duration_minutes,
        preferred_start=payload.preferred_start,
        preferred_end=payload.preferred_end,
        members=[PlanningGroupMember(user_id=user_id) for user_id in member_ids],
    )
    session.add(group)
    await session.commit()
    loaded = (
        await session.scalars(
            select(PlanningGroup)
            .options(selectinload(PlanningGroup.members).selectinload(PlanningGroupMember.user))
            .where(PlanningGroup.id == group.id)
        )
    ).one()
    return serialize_group(loaded)


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
    group_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    group = await session.scalar(
        select(PlanningGroup).where(PlanningGroup.id == group_id, PlanningGroup.owner_id == current_user.id)
    )
    if group is None:
        raise AppError(404, "group_not_found", "Группа не найдена")
    await session.delete(group)
    await session.commit()


@router.get("/groups/{group_id}/suggestions", response_model=SmartSuggestionsResponse)
async def group_suggestions(
    group_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> SmartSuggestionsResponse:
    group = (
        await session.scalars(
            select(PlanningGroup)
            .options(selectinload(PlanningGroup.members).selectinload(PlanningGroupMember.user))
            .where(PlanningGroup.id == group_id, PlanningGroup.owner_id == current_user.id)
        )
    ).first()
    if group is None:
        raise AppError(404, "group_not_found", "Группа не найдена")
    today = datetime.now(ZoneInfo(current_user.timezone)).date()
    search = AvailabilitySearchRequest(
        participant_ids=[member.user_id for member in group.members],
        date_from=today,
        date_to=today + timedelta(days=6),
        daily_start=group.preferred_start,
        daily_end=group.preferred_end,
        minimum_duration_minutes=group.duration_minutes,
        weekdays={1, 2, 3, 4, 5, 6, 7},
        include_weekends=True,
        timezone=current_user.timezone,
    )
    result = await AvailabilityService(session, settings).search(current_user, search)
    return SmartSuggestionsResponse(group=serialize_group(group), suggestions=result.slots[:3])


@router.get("/scheduling-links", response_model=list[SchedulingPollResponse])
async def list_scheduling_links(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[SchedulingPollResponse]:
    polls = list(
        await session.scalars(
            poll_query().where(SchedulingPoll.creator_id == current_user.id).order_by(SchedulingPoll.created_at.desc())
        )
    )
    return [serialize_poll(poll) for poll in polls]


@router.post("/scheduling-links", response_model=SchedulingPollResponse, status_code=status.HTTP_201_CREATED)
async def create_scheduling_link(
    payload: SchedulingPollCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SchedulingPollResponse:
    windows = build_allowed_windows(
        payload.date_from,
        payload.date_to,
        payload.daily_start,
        payload.daily_end,
        {1, 2, 3, 4, 5, 6, 7},
        True,
        payload.timezone,
    )
    duration = timedelta(minutes=payload.duration_minutes)
    options: list[SchedulingPollOption] = []
    for window in windows:
        cursor = window.start_at
        while cursor + duration <= window.end_at and len(options) < 56:
            options.append(SchedulingPollOption(start_at=cursor, end_at=cursor + duration))
            cursor += duration
    if not options:
        raise AppError(422, "poll_has_no_options", "Выбранный диапазон короче длительности встречи")
    poll = SchedulingPoll(
        creator_id=current_user.id,
        token=secrets.token_urlsafe(24),
        title=payload.title.strip(),
        date_from=payload.date_from,
        date_to=payload.date_to,
        timezone=payload.timezone,
        duration_minutes=payload.duration_minutes,
        daily_start=payload.daily_start,
        daily_end=payload.daily_end,
        options=options,
    )
    session.add(poll)
    await session.commit()
    return serialize_poll(await get_poll_by_token(session, poll.token))


@router.get("/public/scheduling-links/{token}", response_model=SchedulingPollResponse)
async def get_public_scheduling_link(
    token: str,
    session: AsyncSession = Depends(get_session),
) -> SchedulingPollResponse:
    return serialize_poll(await get_poll_by_token(session, token))


@router.post("/public/scheduling-links/{token}/responses", response_model=PollVoteReceipt)
async def respond_to_public_scheduling_link(
    token: str,
    payload: PollResponseCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),
) -> PollVoteReceipt:
    client = request.client.host if request.client else "unknown"
    await enforce_rate_limit(redis, f"rate:poll-vote:{client}", RateLimit(120, 3600))
    poll = await get_poll_by_token(session, token)
    if poll.status != "open":
        raise AppError(409, "poll_closed", "Выбор времени уже завершён")
    option_ids = {option.id for option in poll.options}
    if any(vote.option_id not in option_ids for vote in payload.votes):
        raise AppError(422, "invalid_poll_option", "Один из вариантов не относится к этой встрече")
    voter_key = payload.voter_key or secrets.token_urlsafe(24)
    existing = {
        vote.option_id: vote
        for vote in list(
            await session.scalars(
                select(SchedulingPollVote).where(
                    SchedulingPollVote.option_id.in_(option_ids),
                    SchedulingPollVote.voter_key == voter_key,
                )
            )
        )
    }
    for item in payload.votes:
        vote = existing.get(item.option_id)
        if vote is None:
            session.add(
                SchedulingPollVote(
                    option_id=item.option_id,
                    voter_key=voter_key,
                    voter_name=payload.voter_name.strip(),
                    response=item.response,
                )
            )
        else:
            vote.voter_name = payload.voter_name.strip()
            vote.response = item.response
    await session.commit()
    return PollVoteReceipt(voter_key=voter_key, poll=serialize_poll(await get_poll_by_token(session, token)))


@router.post("/scheduling-links/{poll_id}/finalize", response_model=PollFinalizeResponse)
async def finalize_scheduling_link(
    poll_id: int,
    payload: PollFinalize,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PollFinalizeResponse:
    poll = await get_owned_poll(session, poll_id, current_user.id)
    if poll.status != "open":
        raise AppError(409, "poll_closed", "Выбор времени уже завершён")
    option = next((item for item in poll.options if item.id == payload.option_id), None)
    if option is None:
        raise AppError(422, "invalid_poll_option", "Вариант не относится к этому опросу")
    meeting = MeetingProposal(
        creator_id=current_user.id,
        title=payload.title.strip(),
        description=payload.description,
        location=payload.location,
        meeting_url=payload.meeting_url,
        reminder_minutes=payload.reminder_minutes,
        start_at=option.start_at,
        end_at=option.end_at,
        status=MeetingStatus.CONFIRMED,
        participants=[
            MeetingParticipant(
                user_id=current_user.id,
                response=ParticipantResponse.ACCEPTED,
                responded_at=datetime.now(UTC),
            )
        ],
    )
    session.add(meeting)
    await session.flush()
    session.add(
        BusyInterval(
            user_id=current_user.id,
            meeting_id=meeting.id,
            start_at=meeting.start_at,
            end_at=meeting.end_at,
            title=meeting.title,
            visibility=IntervalVisibility.OPEN,
        )
    )
    poll.status = "finalized"
    poll.finalized_option_id = option.id
    await session.commit()
    loaded = await MeetingRepository(session).get_for_user(meeting.id, current_user.id)
    if loaded is None:
        raise AppError(500, "meeting_not_created", "Не удалось загрузить созданную встречу")
    loaded_meeting = await serialize_meeting(loaded, current_user, session)
    return PollFinalizeResponse(
        poll=serialize_poll(await get_owned_poll(session, poll.id, current_user.id)),
        meeting=loaded_meeting,
    )
