"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./community_groupbuy.db"

    # JWT
    SECRET_KEY: str = "change-me-in-production-use-a-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # App metadata
    APP_NAME: str = "Community GroupBuy API"
    DEBUG: bool = False

    # Pagination defaults
    DEFAULT_PAGE_SIZE: int = 20

    # Platform commission rate (percentage)
    COMMISSION_RATE: float = 5.0

    class Config:
        env_file = ".env"


settings = Settings()
