# app/schemas/plan.py

from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime
import uuid


class PlanCreate(BaseModel):
    goal: str = "health"  # 'weight_loss', 'muscle_gain', 'health'
    duration_weeks: int = 4
    fitness_level: Optional[str] = "beginner"


class PlanResponse(BaseModel):
    id: uuid.UUID
    title: str
    goal: Optional[str]
    duration_weeks: Optional[int]
    plan_content: Optional[Any]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
