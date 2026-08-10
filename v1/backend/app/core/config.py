# app/core/config.py

from pydantic_settings import BaseSettings
from loguru import logger
import sys

class Settings(BaseSettings):
    """应用配置 — 从环境变量加载"""

    # 应用
    APP_NAME: str = "Health Agent API"
    DEBUG: bool = False

    # 数据库
    DATABASE_URL: str = "postgresql+asyncpg://postgres:dev_password@localhost:5432/health_agent"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # LLM API Keys
    ANTHROPIC_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""

    # 数据加密
    DATA_ENCRYPTION_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()

def setup_logging(debug: bool = False):
    """配置日志 — loguru"""
    logger.remove()

    # 控制台输出
    logger.add(
        sys.stderr,
        level="DEBUG" if debug else "INFO",
        format="<green>{time:HH:mm:ss}</green> | <level>{level:<8}</level> | <cyan>{name}</cyan> - {message}",
    )

    # 文件输出 — 按天轮转，保留 30 天
    logger.add(
        "logs/app_{time:YYYY-MM-DD}.log",
        level="INFO",
        rotation="1 day",
        retention="30 days",
        compression="zip",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level:<8} | {name}:{function}:{line} - {message}",
    )

    # 错误日志单独文件
    logger.add(
        "logs/error_{time:YYYY-MM-DD}.log",
        level="ERROR",
        rotation="1 day",
        retention="90 days",
        compression="zip",
    )
