from datetime import datetime

from pydantic import Field, model_validator

from app.models.enums import FriendshipStatus
from app.schemas.common import APIModel
from app.schemas.users import UserSummary


class FriendRequestCreate(APIModel):
    username: str | None = Field(default=None, min_length=3, max_length=64)
    invite_code: str | None = Field(default=None, min_length=8, max_length=32)

    @model_validator(mode="after")
    def exactly_one_identifier(self) -> "FriendRequestCreate":
        if bool(self.username) == bool(self.invite_code):
            raise ValueError("Укажите только логин или код приглашения")
        return self


class FriendAliasUpdate(APIModel):
    alias: str | None = Field(default=None, max_length=128)

    @model_validator(mode="after")
    def normalize_alias(self) -> "FriendAliasUpdate":
        if self.alias is not None:
            self.alias = self.alias.strip() or None
        return self


class FriendshipResponse(APIModel):
    id: int
    requester_id: int
    addressee_id: int
    status: FriendshipStatus
    created_at: datetime
    updated_at: datetime
    user: UserSummary | None = None


class FriendResponse(UserSummary):
    friendship_id: int
    friends_since: datetime
    alias: str | None = None
