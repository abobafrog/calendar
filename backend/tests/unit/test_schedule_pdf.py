from datetime import date

from app.services.schedule_pdf import schedule_range


def test_week_range_starts_on_monday() -> None:
    assert schedule_range(date(2026, 7, 30), "week") == (date(2026, 7, 27), date(2026, 8, 3))


def test_month_range_uses_next_month_boundary() -> None:
    assert schedule_range(date(2026, 7, 30), "month") == (date(2026, 7, 1), date(2026, 8, 1))
