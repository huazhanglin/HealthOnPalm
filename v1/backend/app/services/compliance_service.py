# app/services/compliance_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
import logging

from app.models.user import User
from app.models.message import Message
from app.models.health_data import HealthData
from app.models.plan import TrainingPlan

logger = logging.getLogger(__name__)

class ComplianceService:
    """合规服务 -- 处理数据删除、导出等合规需求"""

    async def request_account_deletion(self, user_id: str, db: AsyncSession):
        """
        用户请求注销账号
        - 标记为软删除（deleted_at）
        - 30 天后物理删除
        - 立即吊销所有 Token
        """
        from sqlalchemy import select
        from app.db.session import redis_client

        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if user:
            user.deleted_at = datetime.now(timezone.utc)
            user.is_active = False
            await db.commit()

        # 吊销所有 Token（将用户加入全局黑名单）
        await redis_client.setex(f"user_deactivated:{user_id}", 30 * 86400, "1")
        logger.info(f"User {user_id} requested account deletion")

    async def export_user_data(self, user_id: str, db: AsyncSession) -> dict:
        """导出用户全部数据（数据可携带权）"""
        return {
            "user_profile": await self._export_profile(user_id, db),
            "chat_history": await self._export_messages(user_id, db),
            "health_data": await self._export_health_data(user_id, db),
            "training_plans": await self._export_plans(user_id, db),
            "exported_at": datetime.now(timezone.utc).isoformat(),
        }

    async def _export_profile(self, user_id: str, db: AsyncSession) -> dict:
        from sqlalchemy import select
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if not user:
            return {}
        return {
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        }

    async def _export_messages(self, user_id: str, db: AsyncSession) -> list:
        from sqlalchemy import select
        stmt = select(Message).where(Message.user_id == user_id)
        result = await db.execute(stmt)
        return [
            {"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in result.scalars().all()
        ]

    async def _export_health_data(self, user_id: str, db: AsyncSession) -> list:
        from sqlalchemy import select
        stmt = select(HealthData).where(HealthData.user_id == user_id)
        result = await db.execute(stmt)
        return [
            {"date": str(h.date), "data_source": h.data_source}
            for h in result.scalars().all()
        ]

    async def _export_plans(self, user_id: str, db: AsyncSession) -> list:
        from sqlalchemy import select
        stmt = select(TrainingPlan).where(TrainingPlan.user_id == user_id)
        result = await db.execute(stmt)
        return [
            {"title": p.title, "goal": p.goal, "created_at": p.created_at.isoformat()}
            for p in result.scalars().all()
        ]
