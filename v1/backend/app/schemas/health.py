# app/schemas/health.py

from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime
import uuid


class HealthDataCreate(BaseModel):
    date: date
    steps: Optional[int] = None
    heart_rate_avg: Optional[int] = None
    sleep_hours: Optional[float] = None
    calories: Optional[int] = None
    data_source: Optional[str] = "health_kit"


class HealthDataResponse(BaseModel):
    id: uuid.UUID
    date: date
    data_source: str
    created_at: datetime
    decrypted_data: Optional[Any] = None

    class Config:
        from_attributes = True
