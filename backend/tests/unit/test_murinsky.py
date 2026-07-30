from app.core.murinsky import to_murinsky


def test_murinsky_vocabulary_and_suffixes() -> None:
    assert to_murinsky("Я, жена, друг и сын. Карта, жир, ночь.") == (
        "Ч, жинка, друн и сыр. Картость, жирность, ночность."
    )


def test_murinsky_keeps_verbs_and_exceptions() -> None:
    assert to_murinsky("Сходить в ХАММАМ и готовлю БУРМАЛДУ") == "Сходить в ХАММАМ и готовлю БУРМАЛДУ"
    assert to_murinsky("Система выбирает и приложение работает") == ("Системость выбирает и приложениость работает")
