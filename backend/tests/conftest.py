import os

os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-that-is-long-enough-2026")
os.environ.setdefault("BOT_TOKEN", "123456:test-token")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")
