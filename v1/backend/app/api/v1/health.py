# app/api/v1/health.py

from fastapi import APIRouter, Depends, HTTPException
from typing import List
from datetime import date

from app.schemas.health import HealthDataCreate, HealthDataResponse
from app.services.health_service import HealthService
from app.api.deps import get_current_user, get_health_service, get_redis
from app.models.user import User
from app.api.middleware.rate_limit import check_rate_limit

router = APIRouter()

@router.post("/health/data", response_model=HealthDataResponse)
async def save_health_data(
    request: HealthDataCreate,
    current_user: User = Depends(get_current_user),
    health_service: HealthService = Depends(get_health_service),
    redis=Depends(get_redis),
):
    """保存健康数据（加密存储）"""
    await check_rate_limit(
        user_id=str(current_user.id),
        is_premium=current_user.is_premium,
        resource="health_data",
        redis=redis,
    )
    return await health_service.save_health_data(
        user_id=current_user.id,
        data=request,
    )

@router.get("/health/data", response_model=List[HealthDataResponse])
async def get_health_data(
    start_date: date = None,
    end_date: date = None,
    current_user: User = Depends(get_current_user),
    health_service: HealthService = Depends(get_health_service),
):
    """获取健康数据"""
    return await health_service.get_health_data(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )

@router.post("/health/consent")
async def update_consent(
    consent_version: str,
    current_user: User = Depends(get_current_user),
    health_service: HealthService = Depends(get_health_service),
):
    """更新健康数据授权"""
    return await health_service.update_consent(
        user_id=current_user.id,
        consent_version=consent_version,
    )
