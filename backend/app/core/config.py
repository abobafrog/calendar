from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore", case_sensitive=False)

    app_env: str = "development"
    app_secret_key: str | None = Field(default=None, min_length=43)
    app_secret_key_file: str | None = None
    bot_token: str | None = None
    bot_username: str = "TimeTogetherBot"
    mini_app_url: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"
    database_url: str
    redis_url: str = "redis://redis:6379/0"
    allowed_origins: str = "http://localhost:5173"
    telegram_auth_max_age_seconds: int = Field(default=300, ge=30, le=3600)
    jwt_ttl_seconds: int = Field(default=28_800, ge=300, le=86_400)
    log_level: str = "INFO"
    max_bulk_intervals: int = Field(default=100, ge=1, le=500)
    max_calendar_range_days: int = Field(default=93, ge=1, le=366)
    max_availability_range_days: int = Field(default=31, ge=1, le=93)

    @model_validator(mode="after")
    def load_secret_key(self) -> "Settings":
        if self.app_secret_key_file:
            from pathlib import Path

            value = Path(self.app_secret_key_file).read_text().strip()
            if len(value) < 43:
                raise ValueError("Файл ключа приложения должен содержать не менее 43 случайных символов")
            self.app_secret_key = value
        if not self.app_secret_key or len(self.app_secret_key) < 43:
            raise ValueError("Необходим криптографически случайный ключ приложения")
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @property
    def signing_key(self) -> str:
        if self.app_secret_key is None:  # Kept as a runtime guard for static type checkers.
            raise RuntimeError("APP_SECRET_KEY is not configured")
        return self.app_secret_key

    @property
    def allowed_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
