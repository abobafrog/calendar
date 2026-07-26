from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo


def open_app_keyboard(mini_app_url: str, label: str = "Открыть приложение") -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text=label, web_app=WebAppInfo(url=mini_app_url))]]
    )


def meeting_keyboard(meeting_id: int, mini_app_url: str) -> InlineKeyboardMarkup:
    meeting_url = f"{mini_app_url.rstrip('/')}/meetings/{meeting_id}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="Принять", callback_data=f"meeting:accept:{meeting_id}"),
                InlineKeyboardButton(text="Отклонить", callback_data=f"meeting:decline:{meeting_id}"),
            ],
            [InlineKeyboardButton(text="Открыть", web_app=WebAppInfo(url=meeting_url))],
        ]
    )
