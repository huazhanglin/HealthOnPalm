# app/models/message.py

from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime

from app.db.base import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)  # FK to users(id)
    role = Column(String(20), nullable=False)  # 'user' or 'agent'
    content = Column(Text, nullable=False)
    intent = Column(String(50))

    # 成本追踪字段
    model_used = Column(String(50))
    input_tokens = Column(Integer)
    output_tokens = Column(Integer)
    response_time_ms = Column(Integer)
    is_cached = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
