# app/services/health_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone, date
from typing import List, Optional
import logging

from app.models.health_data import HealthData
from app.core.encryption import DataEncryptor

logger = logging.getLogger(__name__)

class HealthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.encryptor = None
        try:
            self.encryptor = DataEncryptor()
        except RuntimeError:
            logger.warning("DataEncryptor not initialized - DATA_ENCRYPTION_KEY not set")

    async def save_health_data(
        self, user_id: str, data: dict
    ) -> HealthData:
        """保存健康数据（加密存储）"""
        encrypted = None
        if self.encryptor:
            encrypted = self.encryptor.encrypt(data)

        record = HealthData(
            user_id=user_id,
            date=data.get("date", date.today()),
            data_encrypted=encrypted,
            data_source=data.get("data_source", "health_kit"),
            consent_version="1.0",
        )
        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def get_health_data(
        self,
        user_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[HealthData]:
        """获取健康数据"""
        from sqlalchemy import select
        stmt = select(HealthData).where(HealthData.user_id == user_id)
        if start_date:
            stmt = stmt.where(HealthData.date >= start_date)
        if end_date:
            stmt = stmt.where(HealthData.date <= end_date)
        stmt = stmt.order_by(HealthData.date.desc())
        result = await self.db.execute(stmt)
        records = list(result.scalars().all())

        # 解密数据
        if self.encryptor:
            for record in records:
                if record.data_encrypted:
                    record.decrypted_data = self.encryptor.decrypt(record.data_encrypted)

        return records

    async def update_consent(self, user_id: str, consent_version: str) -> dict:
        """更新健康数据授权"""
        from app.models.user import User
        user = await self.db.get(User, user_id)
        if user:
            user.consent_version = consent_version
            user.consent_at = datetime.now(timezone.utc)
            await self.db.commit()
        return {"message": "授权已更新", "consent_version": consent_version}
