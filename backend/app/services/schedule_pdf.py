from collections import defaultdict
from datetime import date, timedelta
from io import BytesIO
from pathlib import Path
from typing import Any, Literal
from zoneinfo import ZoneInfo

from reportlab.lib import colors  # type: ignore[import-untyped]
from reportlab.lib.enums import TA_CENTER  # type: ignore[import-untyped]
from reportlab.lib.pagesizes import A4, landscape  # type: ignore[import-untyped]
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # type: ignore[import-untyped]
from reportlab.lib.units import mm  # type: ignore[import-untyped]
from reportlab.pdfbase import pdfmetrics  # type: ignore[import-untyped]
from reportlab.pdfbase.ttfonts import TTFont  # type: ignore[import-untyped]
from reportlab.platypus import (  # type: ignore[import-untyped]
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.core.murinsky import to_murinsky
from app.models.busy_interval import BusyInterval
from app.models.user import User

ScheduleView = Literal["week", "month"]
ScheduleLanguage = Literal["mur", "ru"]

WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
MONTHS = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
]


def schedule_range(anchor: date, view: ScheduleView) -> tuple[date, date]:
    if view == "week":
        start = anchor - timedelta(days=anchor.isoweekday() - 1)
        return start, start + timedelta(days=7)
    start = anchor.replace(day=1)
    next_month = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    return start, next_month


def _font_path() -> Path:
    candidates = [
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/Library/Fonts/Arial Unicode.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return path
    raise RuntimeError("Для PDF нужен шрифт DejaVu Sans или Arial Unicode")


def _label(text: str, language: ScheduleLanguage) -> str:
    return to_murinsky(text) if language == "mur" else text


def build_schedule_pdf(
    user: User,
    intervals: list[BusyInterval],
    start: date,
    end: date,
    view: ScheduleView,
    language: ScheduleLanguage,
) -> bytes:
    font_name = "TimeTogetherUnicode"
    if font_name not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(font_name, str(_font_path())))

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title=_label("Расписание", language),
        author="Время вместе",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ScheduleTitle",
        parent=styles["Title"],
        fontName=font_name,
        fontSize=22,
        leading=27,
        textColor=colors.HexColor("#262238"),
        alignment=TA_CENTER,
        spaceAfter=4 * mm,
    )
    subtitle_style = ParagraphStyle(
        "ScheduleSubtitle",
        parent=styles["Normal"],
        fontName=font_name,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#777487"),
        alignment=TA_CENTER,
        spaceAfter=7 * mm,
    )
    day_style = ParagraphStyle(
        "ScheduleDay",
        parent=styles["Heading2"],
        fontName=font_name,
        fontSize=11,
        leading=14,
        textColor=colors.white,
    )
    body_style = ParagraphStyle(
        "ScheduleBody",
        parent=styles["BodyText"],
        fontName=font_name,
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#262238"),
        splitLongWords=True,
    )
    muted_style = ParagraphStyle(
        "ScheduleMuted",
        parent=body_style,
        textColor=colors.HexColor("#8b8798"),
    )

    timezone = ZoneInfo(user.timezone)
    grouped: dict[date, list[BusyInterval]] = defaultdict(list)
    for interval in intervals:
        grouped[interval.start_at.astimezone(timezone).date()].append(interval)

    period_name = "неделю" if view == "week" else "месяц"
    story: list[object] = [
        Paragraph(_label(f"Расписание на {period_name}", language), title_style),
        Paragraph(
            f"{user.first_name} {user.last_name or ''} · {start.strftime('%d.%m.%Y')} - "
            f"{(end - timedelta(days=1)).strftime('%d.%m.%Y')} · {user.timezone}",
            subtitle_style,
        ),
    ]
    day = start
    while day < end:
        day_intervals = grouped.get(day, [])
        day_title = f"{WEEKDAYS[day.weekday()]}, {day.day} {MONTHS[day.month - 1]}"
        rows: list[list[object]] = [
            [Paragraph(_label(day_title, language), day_style), ""],
        ]
        if day_intervals:
            for interval in day_intervals:
                local_start = interval.start_at.astimezone(timezone)
                local_end = interval.end_at.astimezone(timezone)
                time_text = f"{local_start:%H:%M} - {local_end:%H:%M}"
                full_title = interval.title or _label("Занят", language)
                rows.append([Paragraph(time_text, body_style), Paragraph(full_title, body_style)])
        else:
            rows.append([Paragraph("-", muted_style), Paragraph(_label("Нет дел", language), muted_style)])
        table = Table(rows, colWidths=[34 * mm, document.width - 34 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("SPAN", (0, 0), (1, 0)),
                    ("BACKGROUND", (0, 0), (1, 0), colors.HexColor("#6558F4")),
                    ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#D7D3E1")),
                    ("INNERGRID", (0, 1), (-1, -1), 0.35, colors.HexColor("#E5E2EC")),
                    ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#FAF9FD")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(KeepTogether([table, Spacer(1, 3 * mm)]))
        day += timedelta(days=1)

    def add_page_number(canvas: Any, doc: Any) -> None:
        page_canvas = canvas
        page_canvas.saveState()
        page_canvas.setFont(font_name, 8)
        page_canvas.setFillColor(colors.HexColor("#8B8798"))
        page_canvas.drawCentredString(landscape(A4)[0] / 2, 8 * mm, f"{_label('Страница', language)} {doc.page}")
        page_canvas.restoreState()

    document.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    return buffer.getvalue()
