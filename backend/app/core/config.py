from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore", case_sensitive=False)

    app_env: str = "development"
    app_secret_key: str = Field(min_length=32)
    bot_token: str | None = None
    bot_username: str = "TimeTogetherBot"
    mini_app_url: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"
    database_url: str
    redis_url: str = "redis://redis:6379/0"
    allowed_origins: str = "http://localhost:5173"
    telegram_auth_max_age_seconds: int = Field(default=300, ge=30, le=3600)
    jwt_ttl_seconds: int = Field(default=900, ge=60, le=86400)
    log_level: str = "INFO"
    max_bulk_intervals: int = Field(default=100, ge=1, le=500)
    max_calendar_range_days: int = Field(default=93, ge=1, le=366)
    max_availability_range_days: int = Field(default=31, ge=1, le=93)

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
