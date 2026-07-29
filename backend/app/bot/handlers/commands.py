from aiogram import F, Router
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import CallbackQuery, Message
from aiogram.types import User as TelegramUser
from sqlalchemy.ext.asyncio import AsyncSession

from app.bot.keyboards import meeting_keyboard, open_app_keyboard
from app.core.config import Settings
from app.core.errors import AppError
from app.core.telegram_auth import TelegramUserData
from app.db.session import SessionFactory
from app.models.enums import ParticipantResponse
from app.models.user import User
from app.repositories.friendships import FriendshipRepository
from app.repositories.meetings import MeetingRepository
from app.repositories.users import UserRepository
from app.schemas.friendships import FriendRequestCreate
from app.services.friendships import FriendshipService
from app.services.meetings import MeetingService

router = Router(name="commands")


async def ensure_user(session: AsyncSession, telegram_user: TelegramUser) -> User:
    data = TelegramUserData(
        id=telegram_user.id,
        first_name=telegram_user.first_name,
        last_name=telegram_user.last_name,
        username=telegram_user.username,
        photo_url=None,
    )
    return await UserRepository(session).upsert_telegram(data)


@router.message(CommandStart(deep_link=True))
async def start_with_payload(message: Message, command: CommandObject, settings: Settings) -> None:
    if message.from_user is None:
        return
    async with SessionFactory() as session:
        actor = await ensure_user(session, message.from_user)
        await session.commit()
        if command.args and command.args.startswith("invite_"):
            try:
                await FriendshipService(session).create_request(
                    actor, FriendRequestCreate(invite_code=command.args.removeprefix("invite_"))
                )
                await message.answer(
                    "Приглашение отправлено. Данные календаря станут доступны только после принятия.",
                    reply_markup=open_app_keyboard(settings.mini_app_url, "Открыть друнов"),
                )
            except AppError as exc:
                await message.answer(exc.message, reply_markup=open_app_keyboard(settings.mini_app_url))
            return
    await message.answer(
        "«Время вместе» помогает находить общее свободное время без раскрытия личных деталей.",
        reply_markup=open_app_keyboard(settings.mini_app_url),
    )


@router.message(CommandStart())
@router.message(Command("app"))
async def open_app(message: Message, settings: Settings) -> None:
    if message.from_user is not None:
        async with SessionFactory() as session:
            await ensure_user(session, message.from_user)
            await session.commit()
    await message.answer("Откройте общий календарь:", reply_markup=open_app_keyboard(settings.mini_app_url))


@router.message(Command("friends"))
async def friends(message: Message, settings: Settings) -> None:
    if message.from_user is None:
        return
    async with SessionFactory() as session:
        user = await ensure_user(session, message.from_user)
        await session.commit()
        count = len(await FriendshipRepository(session).list_friends(user.id))
    await message.answer(
        f"Друнов: {count}. Управление приглашениями доступно в приложении.",
        reply_markup=open_app_keyboard(settings.mini_app_url, "Открыть друнов"),
    )


@router.message(Command("invite"))
async def invite(message: Message, settings: Settings) -> None:
    if message.from_user is None:
        return
    async with SessionFactory() as session:
        user = await ensure_user(session, message.from_user)
        await session.commit()
    link = f"https://t.me/{settings.bot_username}?start=invite_{user.invite_code}"
    await message.answer(
        "Персональная ссылка приглашения. Она не открывает календарь без взаимного принятия в друны:\n" + link
    )


@router.message(Command("meetings"))
async def meetings(message: Message, settings: Settings) -> None:
    if message.from_user is None:
        return
    async with SessionFactory() as session:
        user = await ensure_user(session, message.from_user)
        await session.commit()
        count = len(await MeetingRepository(session).list_for_user(user.id))
    await message.answer(f"Встреч: {count}.", reply_markup=open_app_keyboard(settings.mini_app_url, "Открыть встречи"))


@router.message(Command("help"))
async def help_command(message: Message, settings: Settings) -> None:
    await message.answer(
        "/app — календарь\n/friends — друны\n/invite — ссылка-приглашение\n/meetings — встречи\n/help — помощь",
        reply_markup=open_app_keyboard(settings.mini_app_url),
    )


@router.callback_query(F.data.startswith("meeting:"))
async def meeting_response(callback: CallbackQuery, settings: Settings) -> None:
    if callback.from_user is None or callback.data is None:
        return
    _, action, raw_meeting_id = callback.data.split(":", 2)
    response = ParticipantResponse.ACCEPTED if action == "accept" else ParticipantResponse.DECLINED
    async with SessionFactory() as session:
        user = await ensure_user(session, callback.from_user)
        await session.commit()
        try:
            meeting = await MeetingService(session).respond(user, int(raw_meeting_id), response)
            if isinstance(callback.message, Message):
                await callback.message.edit_reply_markup(
                    reply_markup=meeting_keyboard(meeting.id, settings.mini_app_url)
                )
            await callback.answer("Ответ сохранён", show_alert=False)
        except AppError as exc:
            await callback.answer(exc.message, show_alert=True)
