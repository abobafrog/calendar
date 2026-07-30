import html
import re
import secrets
import time
from datetime import date

import httpx

from app.schemas.holidays import HolidayResponse

PRIMARY_SOURCE = "https://kakoysegodnyaprazdnik.ru/"
FALLBACK_SOURCE = "https://www.kakoy-segodnya-prazdnik.ru/index.html"
REQUEST_HEADERS = {
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "ru-RU,ru;q=0.9",
    "User-Agent": "Mozilla/5.0 (compatible; TimeTogether/1.0; +https://froklalol.ru)",
}
_cache: tuple[date, float, list[str], str] | None = None
_last_title: str | None = None


def _clean_title(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value)
    value = re.sub(r"\s*\([^)]*[A-Za-z][^)]*\)", "", value)
    return re.sub(r"\s+", " ", html.unescape(value)).strip(" \n\r\t—-")


def parse_holidays(page: str) -> list[str]:
    block_match = re.search(
        r'<div[^>]+id=["\']pr_day["\'][^>]*>(.*?)<!--\s*Именины',
        page,
        flags=re.IGNORECASE | re.DOTALL,
    )
    block = block_match.group(1) if block_match else page
    titles = [_clean_title(value) for value in re.findall(r"<dt[^>]*>(.*?)</dt>", block, re.I | re.S)]
    return list(dict.fromkeys(title for title in titles if 4 <= len(title) <= 240))


def classify_holiday(title: str) -> str:
    normalized = title.casefold()
    if normalized.startswith("всемирн"):
        return "Всемирный"
    if normalized.startswith("международн"):
        return "Международный"
    if any(word in normalized for word in ("иконы", "свят", "мучен", "преподоб", "церков")):
        return "Религиозный"
    if " - " in title or "независимости" in normalized or "национальн" in normalized:
        return "Национальный"
    return "Необычный"


def _choose_title(titles: list[str]) -> str:
    global _last_title
    choices = [title for title in titles if title != _last_title] or titles
    _last_title = secrets.choice(choices)
    return _last_title


async def _load_source(client: httpx.AsyncClient, url: str) -> list[str]:
    response = await client.get(url, headers=REQUEST_HEADERS)
    response.raise_for_status()
    if "Проверка безопасности" in response.text:
        return []
    return parse_holidays(response.text)


def _filter_titles(titles: list[str], allowed_categories: set[str]) -> list[str]:
    return [title for title in titles if classify_holiday(title) in allowed_categories]


async def get_random_holiday(today: date, allowed_categories: list[str]) -> HolidayResponse | None:
    global _cache
    allowed = set(allowed_categories)
    if not allowed:
        return None
    if _cache is not None:
        cached_date, cached_at, cached_titles, cached_source = _cache
        if cached_date == today and time.monotonic() - cached_at < 900:
            eligible_titles = _filter_titles(cached_titles, allowed)
            if not eligible_titles:
                return None
            title = _choose_title(eligible_titles)
            return HolidayResponse(
                title=title,
                category=classify_holiday(title),
                date=today,
                source_url=cached_source,
            )
    timeout = httpx.Timeout(6.0, connect=3.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        for source in (PRIMARY_SOURCE, FALLBACK_SOURCE):
            try:
                titles = await _load_source(client, source)
            except httpx.HTTPError:
                continue
            if titles:
                _cache = (today, time.monotonic(), titles, source)
                eligible_titles = _filter_titles(titles, allowed)
                if not eligible_titles:
                    return None
                title = _choose_title(eligible_titles)
                return HolidayResponse(
                    title=title,
                    category=classify_holiday(title),
                    date=today,
                    source_url=source,
                )
    return None
