# app/models/plan.py

from sqlalchemy import Column, String, Integer, Boolean, DateTime, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from datetime import datetime

from app.db.base import Base


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)  # FK to users(id)
    title = Column(String(200), nullable=False)
    goal = Column(String(50))  # 'weight_loss', 'muscle_gain', 'health'
    duration_weeks = Column(Integer)

    plan_content = Column(JSONB)

    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
