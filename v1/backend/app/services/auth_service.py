# app/services/auth_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, timedelta
import logging

from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.models.user import User

logger = logging.getLogger(__name__)

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, email: str, password: str, full_name: str = "") -> dict:
        """用户注册"""
        # TODO: 检查邮箱是否已注册
        # TODO: 密码复杂度校验
        user = User(
            email=email,
            hashed_password=hash_password(password),
            full_name=full_name,
            consent_version="1.0",
            consent_at=datetime.now(timezone.utc),
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return self._generate_tokens(str(user.id))

    async def login(self, email: str, password: str) -> dict:
        """用户登录"""
        from sqlalchemy import select
        stmt = select(User).where(User.email == email)
        result = await self.db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            # TODO: 记录登录失败次数，5 次锁定 15 分钟
            raise ValueError("邮箱或密码错误")

        if not user.is_active or user.deleted_at is not None:
            raise ValueError("账号已禁用或注销")

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.commit()

        return self._generate_tokens(str(user.id))

    def _generate_tokens(self, user_id: str) -> dict:
        return {
            "access_token": create_access_token({"sub": user_id}),
            "refresh_token": create_refresh_token({"sub": user_id}),
            "token_type": "bearer",
        }
