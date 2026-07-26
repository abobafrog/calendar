from datetime import UTC, date, datetime, time, timedelta

from app.services.availability import (
    TimeSpan,
    build_allowed_windows,
    find_common_free_slots,
    merge_spans,
)


def utc(hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 7, 24, hour, minute, tzinfo=UTC)


def test_merge_spans_merges_overlapping_and_touching_intervals() -> None:
    merged = merge_spans(
        [
            TimeSpan(utc(10), utc(11)),
            TimeSpan(utc(10, 30), utc(12)),
            TimeSpan(utc(12), utc(13)),
            TimeSpan(utc(15), utc(16)),
        ]
    )
    assert merged == [TimeSpan(utc(10), utc(13)), TimeSpan(utc(15), utc(16))]


def test_find_common_free_slots_uses_exclusive_end_boundaries() -> None:
    slots = find_common_free_slots(
        [TimeSpan(utc(9), utc(18))],
        [TimeSpan(utc(10), utc(11)), TimeSpan(utc(12), utc(14))],
        timedelta(hours=1),
    )
    assert slots == [
        TimeSpan(utc(9), utc(10)),
        TimeSpan(utc(11), utc(12)),
        TimeSpan(utc(14), utc(18)),
    ]


def test_spring_dst_window_uses_real_elapsed_time() -> None:
    windows = build_allowed_windows(
        date(2026, 3, 29),
        date(2026, 3, 29),
        time(1, 30),
        time(4),
        {7},
        True,
        "Europe/Amsterdam",
    )
    assert windows == [
        TimeSpan(
            datetime(2026, 3, 29, 0, 30, tzinfo=UTC),
            datetime(2026, 3, 29, 2, 0, tzinfo=UTC),
        )
    ]


def test_busy_interval_can_cross_midnight() -> None:
    slots = find_common_free_slots(
        [
            TimeSpan(
                datetime(2026, 7, 24, 20, tzinfo=UTC),
                datetime(2026, 7, 25, 2, tzinfo=UTC),
            )
        ],
        [
            TimeSpan(
                datetime(2026, 7, 24, 23, tzinfo=UTC),
                datetime(2026, 7, 25, 1, tzinfo=UTC),
            )
        ],
        timedelta(minutes=30),
    )
    assert len(slots) == 2
