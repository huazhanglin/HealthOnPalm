# app/api/v1/plan_api.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
import logging

from app.schemas.plan import PlanCreate, PlanResponse
from app.services.plan_service import PlanService
from app.api.deps import get_current_user, get_redis
from app.models.user import User
from app.api.middleware.rate_limit import check_rate_limit
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/plan/generate", response_model=PlanResponse)
async def generate_plan(
    request: PlanCreate,
    current_user: User = Depends(get_current_user),
    redis=Depends(get_redis),
    db=Depends(get_db),
):
    """生成训练计划（调用 LLM）"""
    await check_rate_limit(
        user_id=str(current_user.id),
        is_premium=current_user.is_premium,
        resource="plan",
        redis=redis,
    )
    service = PlanService(db)
    return await service.generate_plan(user_id=current_user.id, request=request)

@router.get("/plans", response_model=List[PlanResponse])
async def get_plans(
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """获取用户的训练计划列表"""
    service = PlanService(db)
    return await service.get_plans(user_id=current_user.id)

@router.get("/plan/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: str,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    """获取单个训练计划"""
    service = PlanService(db)
    return await service.get_plan(user_id=current_user.id, plan_id=plan_id)
