from app.schemas.auth import AuthResponse, TelegramAuthRequest
from app.schemas.availability import AvailabilitySearchRequest, AvailabilitySearchResponse
from app.schemas.calendar import BusyIntervalCreate, BusyIntervalResponse
from app.schemas.friendships import FriendRequestCreate, FriendshipResponse
from app.schemas.meetings import MeetingCreate, MeetingResponse
from app.schemas.users import UserResponse, UserUpdate

__all__ = [
    "AuthResponse",
    "AvailabilitySearchRequest",
    "AvailabilitySearchResponse",
    "BusyIntervalCreate",
    "BusyIntervalResponse",
    "FriendRequestCreate",
    "FriendshipResponse",
    "MeetingCreate",
    "MeetingResponse",
    "TelegramAuthRequest",
    "UserResponse",
    "UserUpdate",
]
