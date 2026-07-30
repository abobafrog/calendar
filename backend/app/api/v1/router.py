from app.api.v1 import (
    auth,
    availability,
    calendar,
    friendships,
    holidays,
    meetings,
    notifications,
    payments,
    planning,
    users,
)
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(friendships.router)
api_router.include_router(holidays.router)
api_router.include_router(calendar.router)
api_router.include_router(availability.router)
api_router.include_router(meetings.router)
api_router.include_router(notifications.router)
api_router.include_router(payments.router)
api_router.include_router(planning.router)
