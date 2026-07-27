from enum import StrEnum


class FriendshipStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class IntervalVisibility(StrEnum):
    OPEN = "open"
    CLOSED = "closed"


class MeetingStatus(StrEnum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class ParticipantResponse(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class TimeFormat(StrEnum):
    H12 = "12h"
    H24 = "24h"
