# app/models/health_data.py

from sqlalchemy import Column, String, Date, DateTime, LargeBinary, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.db.base import Base


class HealthData(Base):
    __tablename__ = "health_data"
    __table_args__ = (
        UniqueConstraint("user_id", "date", name="uq_health_user_date"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)  # FK to users(id)
    date = Column(Date, nullable=False)

    # 健康数据（加密 JSON 存储）
    data_encrypted = Column(LargeBinary)

    # 元数据
    data_source = Column(String(20), nullable=False, default="health_kit")
    consent_version = Column(String(20))

    # 合规字段
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime)

    # 运行时属性（不存储）
    decrypted_data = None
