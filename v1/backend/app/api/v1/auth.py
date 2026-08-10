# app/api/v1/auth.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from datetime import datetime, timezone

from app.db.session import get_db
from app.api.deps import get_redis, get_current_user
from app.core.security import (
    create_access_token, create_refresh_token, verify_token,
    hash_password, verify_password,
)
from app.models.user import User

router = APIRouter()

@router.post("/auth/register")
async def register(
    email: str,
    password: str,
    full_name: str = "",
    db: AsyncSession = Depends(get_db),
):
    """用户注册"""
    # TODO: 检查邮箱是否已注册
    # TODO: 密码复杂度校验（至少 8 位，含字母+数字）
    # TODO: 创建用户记录
    # TODO: 签发 Token
    pass

@router.post("/auth/login")
async def login(
    email: str,
    password: str,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """用户登录"""
    # TODO: 查询用户
    # TODO: 验证密码 (bcrypt)
    # TODO: 检查登录失败次数（5 次锁定 15 分钟）
    # TODO: 签发 Access Token + Refresh Token
    pass

@router.post("/auth/refresh")
async def refresh_token(
    refresh_token: str,
    redis: Redis = Depends(get_redis),
):
    """用 Refresh Token 换取新的 Access Token"""
    payload = verify_token(refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="无效的刷新凭证")

    # 检查是否在黑名单中（用户登出时将 refresh token 加入黑名单）
    jti = payload.get("jti")
    if await redis.exists(f"blacklist:{jti}"):
        raise HTTPException(status_code=401, detail="凭证已失效")

    new_access = create_access_token({"sub": payload["sub"]})
    return {"access_token": new_access, "token_type": "bearer"}

@router.post("/auth/logout")
async def logout(
    refresh_token: str,
    current_user: User = Depends(get_current_user),
    redis: Redis = Depends(get_redis),
):
    """登出 -- 将 Refresh Token 加入黑名单"""
    payload = verify_token(refresh_token)
    jti = payload.get("jti")
    expire = payload.get("exp") - int(datetime.now(timezone.utc).timestamp())
    await redis.setex(f"blacklist:{jti}", expire, "1")
    return {"message": "已退出登录"}
