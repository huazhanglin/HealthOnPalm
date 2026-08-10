# app/schemas/message.py

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid


class MessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: Optional[List[dict]] = Field(default=[])


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    intent: Optional[str] = None
    model_used: Optional[str] = None
    response_time_ms: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True
