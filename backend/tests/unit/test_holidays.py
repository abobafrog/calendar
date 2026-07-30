import app.services.holidays as holidays
from app.services.holidays import classify_holiday, parse_holidays


def test_parses_only_holidays_from_daily_block() -> None:
    page = """
    <div id="pr_day"><dl><dt>Всемирный день улыбки (World Smile Day)</dt></dl><dt>День друзей</dt></div>
    <!-- Именины --><dt>Не праздник</dt>
    """
    assert parse_holidays(page) == ["Всемирный день улыбки", "День друзей"]


def test_classifies_common_holiday_types() -> None:
    assert classify_holiday("Всемирный день улыбки") == "Всемирный"
    assert classify_holiday("Международный день дружбы") == "Международный"
    assert classify_holiday("День независимости - Вануату") == "Национальный"


def test_does_not_repeat_same_holiday_twice(monkeypatch) -> None:
    holidays._last_title = None
    monkeypatch.setattr(holidays.secrets, "choice", lambda values: values[0])

    first = holidays._choose_title(["Первый", "Второй"])
    second = holidays._choose_title(["Первый", "Второй"])

    assert first == "Первый"
    assert second == "Второй"
