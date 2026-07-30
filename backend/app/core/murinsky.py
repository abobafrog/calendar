import re

DIRECT_WORDS = {
    "я": "ч",
    "жена": "жинка",
    "друг": "друн",
    "друга": "друна",
    "другу": "друну",
    "другом": "друном",
    "друзья": "друны",
    "друзей": "друнов",
    "друзьям": "друнам",
    "друзьями": "друнами",
    "сын": "сыр",
    "сына": "сыра",
    "сыновья": "сыры",
}
EXCEPTIONS = {"бурмалда", "бурмалду", "бурмалдеть", "хаммам", "хаммама", "хаммаме"}
FUNCTION_WORDS = {"без", "в", "все", "для", "до", "и", "или", "на", "не", "нет", "о", "от", "по", "с", "у", "это"}
VERBS = {
    "выбрать",
    "выбирает",
    "готовлю",
    "голосуют",
    "добавить",
    "найти",
    "показать",
    "работает",
    "сохранить",
    "скачать",
    "сходить",
    "удалить",
}
VERB_ENDINGS = (
    "ешь",
    "ишь",
    "ете",
    "ите",
    "ают",
    "яют",
    "уют",
    "ает",
    "яет",
    "ует",
    "ются",
    "атся",
    "ятся",
    "ется",
    "ится",
    "ем",
    "им",
    "ют",
    "ут",
    "ят",
    "ат",
    "ет",
    "ёт",
    "ит",
)


def _case(source: str, translated: str) -> str:
    if source.isupper():
        return translated.upper()
    if source[:1].isupper():
        return translated.capitalize()
    return translated


def murinsky_word(source: str) -> str:
    word = source.lower()
    if word in DIRECT_WORDS:
        return _case(source, DIRECT_WORDS[word])
    if (
        len(word) <= 2
        or word in EXCEPTIONS
        or word in FUNCTION_WORDS
        or word in VERBS
        or word.endswith(VERB_ENDINGS)
        or word.endswith(("ость", "ности", "ностью", "ть", "ться", "тся"))
    ):
        return source
    stem = word
    ending = "ность"
    if stem.endswith(tuple("аяоёеэю")):
        stem = stem[:-1]
        ending = "ость"
    elif stem.endswith(tuple("ыиь")):
        stem = stem[:-1]
    return _case(source, f"{stem}{ending}")


def to_murinsky(text: str) -> str:
    return re.sub(r"[А-Яа-яЁё]+", lambda match: murinsky_word(match.group(0)), text)
