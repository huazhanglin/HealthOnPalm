# app/api/deps.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from app.db.session import get_db
from app.core.security import verify_token
from app.core.config import settings
from app.models.user import User
from app.services.chat_service import ChatService
from app.services.health_service import HealthService

security = HTTPBearer()

async def get_redis() -> Redis:
    """获取 Redis 连接"""
    from app.db.session import redis_client
    return redis_client

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> User:
    """验证 JWT 并返回当前用户"""
    token = credentials.credentials
    payload = verify_token(token)

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="无效的凭证类型")

    user_id = payload.get("sub")

    # 检查是否在全局黑名单中（账号已注销）
    if await redis.exists(f"user_deactivated:{user_id}"):
        raise HTTPException(status_code=401, detail="账号已注销")

    user = await db.get(User, user_id)
    if not user or not user.is_active or user.deleted_at is not None:
        raise HTTPException(status_code=401, detail="用户不存在或已禁用")

    return user

# 工厂函数 — Depends 必须传入可调用对象 (修订 P0-2)
def get_chat_service(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> ChatService:
    return ChatService(db, redis)

def get_health_service(
    db: AsyncSession = Depends(get_db),
) -> HealthService:
    return HealthService(db)
